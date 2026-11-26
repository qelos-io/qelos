import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';
import { createMockSdk } from '../src/sdk/index.js';
import { blueprint } from '../src/fixtures/index.js';

/**
 * Blueprint and admin permissions apply to the caller however they are identified: a persona, a signed-in session
 * (bearer token or cookie) or an API token.
 */
const rule = (operation: string, extra: Record<string, unknown>) => ({ operation, scope: 'tenant', guest: false, ...extra });
const crud = (extra: Record<string, unknown>) => ['create', 'read', 'update', 'delete'].map((op) => rule(op, extra));

const seed = {
  personas: [
    { email: 'admin@x.com', password: 'password-1', roles: ['admin'] },
    { email: 'user@x.com', password: 'password-1', roles: ['user'] },
    { email: 'other@x.com', password: 'password-1', roles: ['user'] },
    { email: 'lead@x.com', password: 'password-1', roles: ['user'], workspaces: [{ name: 'Acme', roles: ['lead'] }, { name: 'Side', roles: ['user'] }] },
  ],
  blueprints: [
    blueprint('secret', { permissions: crud({ roleBased: ['admin'] }) }),
    blueprint('note', { permissionScope: 'user', permissions: crud({ roleBased: ['user'], scope: 'user' }) }),
    blueprint('task', { permissionScope: 'workspace', permissions: crud({ workspaceRoleBased: ['lead'], scope: 'workspace' }) }),
    blueprint('notice', { permissions: [rule('read', { guest: true }), rule('create', { roleBased: ['user'] })] }),
  ],
};

const REFUSED = /not permitted/;
const create = (sdk: any, bp: string) => sdk.blueprints.entitiesOf(bp).create({ title: 'x' });
const list = (sdk: any, bp: string) => sdk.blueprints.entitiesOf(bp).getList();

async function signedIn(username: string, options: object = {}) {
  const t = createMockSdk({ seed, ...options });
  await t.sdk.authentication.oAuthSignin({ username, password: 'password-1' });
  return t;
}

describe('signed-in users are held to the blueprint permissions', () => {
  test('a non-admin is refused what only admins may do; an admin is not', async () => {
    const user = await signedIn('user@x.com');
    await assert.rejects(create(user.sdk, 'secret'), REFUSED);
    await assert.rejects(list(user.sdk, 'secret'), REFUSED);
    const admin = await signedIn('admin@x.com');
    assert.ok((await create(admin.sdk, 'secret')).identifier);
  });

  test('entities belong to who created them, and the user scope hides the others', async () => {
    const { sdk, mock } = await signedIn('user@x.com');
    const mine = await create(sdk, 'note');
    const me = await sdk.authentication.getLoggedInUser();
    assert.equal(mine.user, me._id);
    await sdk.authentication.oAuthSignin({ username: 'other@x.com', password: 'password-1' });
    assert.deepEqual(await list(sdk, 'note'), []);
    assert.equal(mock.state.entities.list('note').length, 1);
  });

  test('workspace roles follow the active workspace of the session', async () => {
    const { sdk, mock } = await signedIn('lead@x.com');
    const acme = mock.state.workspaces.findOne((w) => w.name === 'Acme')!;
    const side = mock.state.workspaces.findOne((w) => w.name === 'Side')!;
    assert.equal((await create(sdk, 'task')).workspace, acme._id);
    await sdk.workspaces.activate(side._id);
    await assert.rejects(create(sdk, 'task'), REFUSED);
    await sdk.workspaces.activate(acme._id);
    assert.equal((await create(sdk, 'task')).workspace, acme._id);
  });

  test('only admins write blueprints and agents', async () => {
    const mock = createMockQelos({ seed, logger: () => {} });
    const bearer = async (username: string) => {
      const res = await mock.fetch('/api/signin', { method: 'POST', body: JSON.stringify({ username, password: 'password-1', authType: 'oauth' }) });
      return { authorization: `Bearer ${((await res.json()) as any).payload.token}` };
    };
    const [user, admin] = [await bearer('user@x.com'), await bearer('admin@x.com')];
    for (const path of ['/api/blueprints', '/api/ai/agents']) {
      const body = JSON.stringify({ identifier: 'new', name: 'New', triggerSource: 's1', targetSource: 's2' });
      const post = (headers: Record<string, string>) => mock.fetch(path, { method: 'POST', headers, body });
      assert.equal((await post(user)).status, 401, path);
      assert.equal((await post(admin)).status, path === '/api/ai/agents' ? 201 : 200, path);
    }
  });
});

describe('other ways of being identified', () => {
  test('a session cookie, as forwarded by an integrator', async () => {
    const mock = createMockQelos({ seed, logger: () => {} });
    const signin = await mock.fetch('/api/signin', { method: 'POST', body: JSON.stringify({ username: 'user@x.com', password: 'password-1' }) });
    const cookie = signin.headers.get('set-cookie')!.split(';')[0];
    const post = (bp: string) => mock.fetch(`/api/blueprints/${bp}/entities`, { method: 'POST', headers: { cookie }, body: '{"title":"x"}' });
    assert.equal((await post('secret')).status, 403);
    assert.equal((await post('note')).status, 200);
    const blueprints = await mock.fetch('/api/blueprints', { method: 'POST', headers: { cookie }, body: '{"identifier":"new"}' });
    assert.equal(blueprints.status, 401);
  });

  test('an API token acts as its owner; expired, it is a guest', async () => {
    const mock = createMockQelos({ seed, logger: () => {} });
    const made = await mock.fetch('/api/me/api-tokens', {
      method: 'POST',
      headers: { [PERSONA_HEADER]: 'user@x.com' },
      body: JSON.stringify({ nickname: 'ci', expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    });
    const { token } = (await made.json()) as any;
    const post = (bp: string) => mock.fetch(`/api/blueprints/${bp}/entities`, { method: 'POST', headers: { 'x-api-key': token }, body: '{"title":"x"}' });
    assert.equal((await post('secret')).status, 403);
    assert.equal((await post('note')).status, 200);
    const [stored] = mock.state.apiTokens.list();
    mock.state.apiTokens.update(stored._id, { expiresAt: new Date(Date.now() - 1000).toISOString() });
    assert.equal((await post('note')).status, 403);
  });

  test('a persona gets the workspace it is a member of', async () => {
    const { as, mock } = createMockSdk({ seed });
    const acme = (await create(as('lead@x.com'), 'task')).workspace;
    assert.equal(mock.state.workspaces.get(acme)!.name, 'Acme');
  });

  test('a role an administrator changed applies to the persona', async () => {
    const { as, mock } = createMockSdk({ seed });
    await assert.rejects(create(as('user@x.com'), 'secret'), REFUSED);
    const user = mock.state.users.findOne((u) => u.email === 'user@x.com')!;
    await mock.fetch(`/api/users/${user._id}`, { method: 'PUT', headers: { [PERSONA_HEADER]: 'admin@x.com' }, body: '{"roles":["admin"]}' });
    assert.ok(await create(as('user@x.com'), 'secret'));
  });
});

describe('a session that ended is a guest', () => {
  test('expired access tokens get what guests get, and nothing more', async () => {
    const { sdk, mock } = await signedIn('user@x.com');
    await create(sdk, 'notice');
    mock.faults.expireAccessTokens();
    assert.equal((await list(sdk, 'notice')).length, 1);
    await assert.rejects(create(sdk, 'notice'), REFUSED);
    await assert.rejects(create(sdk, 'secret'), REFUSED);
  });

  test('also with a default persona: the ended session does not become that persona', async () => {
    const { sdk, mock } = await signedIn('user@x.com', { defaultPersona: 'admin@x.com' });
    await assert.rejects(create(sdk, 'secret'), REFUSED);
    mock.faults.expireAccessTokens();
    await assert.rejects(create(sdk, 'secret'), REFUSED);
  });
});

describe('what stays as it was', () => {
  const post = (mock: ReturnType<typeof createMockQelos>, headers: Record<string, string> = {}) =>
    mock.fetch('/api/blueprints/secret/entities', { method: 'POST', headers, body: '{"title":"x"}' });

  test('no credentials, or ones the mock never issued: not enforced', async () => {
    const mock = createMockQelos({ seed, logger: () => {} });
    for (const headers of [{}, { 'x-api-key': 'mock' }, { authorization: 'Bearer a.b.signature' }, { cookie: 'token=unrelated' }]) {
      assert.equal((await post(mock, headers as Record<string, string>)).status, 200, JSON.stringify(headers));
    }
  });

  test('without them the default persona applies', async () => {
    const mock = createMockQelos({ seed, logger: () => {}, defaultPersona: 'user@x.com' });
    assert.equal((await post(mock)).status, 403);
    assert.equal((await post(mock, { 'x-api-key': 'mock' })).status, 403);
    assert.equal((await post(mock, { [PERSONA_HEADER]: 'admin@x.com' })).status, 200);
  });

  test('a custom authenticate option replaces all of it', async () => {
    const mock = createMockQelos({ seed, logger: () => {}, authenticate: () => ({ roles: ['admin'] }) });
    assert.equal((await post(mock)).status, 200);
  });
});

describe('strictPermissions: callers the mock cannot identify are guests', () => {
  const strict = () => createMockQelos({ seed, logger: () => {}, strictPermissions: true });
  const call = (mock: ReturnType<typeof createMockQelos>, method: string, path: string, headers: Record<string, string> = {}) =>
    mock.fetch(path, { method, headers, ...(method === 'GET' ? {} : { body: '{"title":"x","identifier":"new"}' }) });

  test('no credentials, or made-up ones, get what guests get', async () => {
    const mock = strict();
    const unidentified: Array<Record<string, string>> = [{}, { 'x-api-key': 'mock' }, { authorization: 'Bearer a.b.signature' }];
    for (const headers of unidentified) {
      assert.equal((await call(mock, 'GET', '/api/blueprints/notice/entities', headers)).status, 200);
      assert.equal((await call(mock, 'POST', '/api/blueprints/secret/entities', headers)).status, 403);
      assert.equal((await call(mock, 'POST', '/api/blueprints/notice/entities', headers)).status, 403);
      assert.equal((await call(mock, 'GET', '/api/blueprints', headers)).status, 401);
      assert.equal((await call(mock, 'POST', '/api/blueprints', headers)).status, 401);
      assert.equal((await call(mock, 'POST', '/api/ai/agents', headers)).status, 401);
    }
  });

  test('identified callers and the default persona are unaffected', async () => {
    assert.equal((await call(strict(), 'POST', '/api/blueprints/secret/entities', { [PERSONA_HEADER]: 'admin@x.com' })).status, 200);
    const mock = createMockQelos({ seed, logger: () => {}, strictPermissions: true, defaultPersona: 'admin@x.com' });
    assert.equal((await call(mock, 'POST', '/api/blueprints/secret/entities')).status, 200);
  });

  test('is checked as a boolean', () => {
    assert.throws(() => createMockQelos({ strictPermissions: 'yes' as any }), /strictPermissions/);
  });
});

describe('bypassAdmin: an administrator asks to be treated as a regular user', () => {
  const admin = { [PERSONA_HEADER]: 'admin@x.com' };
  const setupMock = () => createMockQelos({ seed, logger: () => {} });
  const post = (mock: ReturnType<typeof createMockQelos>, bp: string, headers: Record<string, string> = {}, body: object = {}, query = '') =>
    mock.fetch(`/api/blueprints/${bp}/entities${query}`, { method: 'POST', headers: { ...admin, ...headers }, body: JSON.stringify({ title: 'x', ...body }) });

  test('by query, header or body', async () => {
    const mock = setupMock();
    assert.equal((await post(mock, 'note')).status, 200);
    // `note` grants the `user` role only
    assert.equal((await post(mock, 'note', {}, {}, '?bypassAdmin=true')).status, 403);
    assert.equal((await post(mock, 'note', { 'x-bypass-admin': '1' })).status, 403);
    assert.equal((await post(mock, 'note', {}, { bypassAdmin: true })).status, 403);
    // the body wins over the query
    assert.equal((await post(mock, 'note', {}, { bypassAdmin: false }, '?bypassAdmin=true')).status, 200);
    // `secret` grants the admin role itself, so it stays allowed
    assert.equal((await post(mock, 'secret', {}, {}, '?bypassAdmin=true')).status, 200);
  });

  test('applies to every data call, and the parameter is not a filter', async () => {
    const mock = setupMock();
    await post(mock, 'secret');
    const get = async (path: string) => mock.fetch(path, { headers: admin });
    assert.equal(((await (await get('/api/blueprints/secret/entities?bypassAdmin=true')).json()) as any[]).length, 1);
    for (const path of ['/api/blueprints/note/entities', '/api/blueprints/note/charts/count']) {
      assert.equal((await get(path)).status, 200);
      assert.equal((await get(`${path}?bypassAdmin=true`)).status, 403);
    }
  });

  test('the administrator SDK asks for it by default', async () => {
    const mock = setupMock();
    const { default: loaded }: any = await import('@qelos/sdk/administrator');
    const Admin = loaded?.default ?? loaded;
    const sdk = new Admin({ appUrl: 'http://qelos.mock', fetch: mock.fetch, extraHeaders: async () => admin });
    await assert.rejects(sdk.entities('note').getList(), REFUSED);
    const without = new Admin({ appUrl: 'http://qelos.mock', fetch: mock.fetch, extraHeaders: async () => admin, extraQueryParams: () => ({}) });
    assert.deepEqual(await without.entities('note').getList(), []);
  });
});

