import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as adminModule from '@qelos/sdk/administrator';
import { createMockSdk } from '../src/sdk/index.js';
import { PERSONA_HEADER } from '../src/index.js';

// tsx loads the SDK as CommonJS: the class sits on `default` (twice, depending on the loader)
const loaded: any = adminModule;
const Admin: new (options: any) => any = loaded.default?.default ?? loaded.default ?? loaded;

const personas = [
  { email: 'admin@x.com', password: 'admin-pass', roles: ['admin'], name: 'Ada Admin' },
  { email: 'user@x.com', password: 'user-pass', roles: ['user'], name: 'Una User' },
];

function setup(seed: object = { personas }) {
  const t = createMockSdk({ seed });
  const as = (persona?: string) =>
    new Admin({ appUrl: 'http://qelos.mock', fetch: t.mock.fetch, ...(persona ? { extraHeaders: async () => ({ [PERSONA_HEADER]: persona }) } : { apiToken: 'unknown' }) });
  const call = (method: string, path: string, body?: object, headers: Record<string, string> = {}) =>
    t.mock.fetch(path, { method, headers: { [PERSONA_HEADER]: 'admin@x.com', 'content-type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { ...t, admin: as('admin@x.com'), as, call };
}

describe('administrator users', () => {
  test('only privileged users get in: 401 with the service messages', async () => {
    const { mock, as } = setup();
    const anonymous = await mock.fetch('/api/users');
    assert.equal(anonymous.status, 401);
    assert.deepEqual(await anonymous.json(), { message: 'you are not authorized. must be logged in.' });
    const plain = await mock.fetch('/api/users', { headers: { [PERSONA_HEADER]: 'user@x.com' } });
    assert.equal(plain.status, 401);
    assert.deepEqual(await plain.json(), { message: 'you are not privileged.' });
    await assert.rejects(as('user@x.com').users.getList());
  });

  test('a signed-in administrator is recognised by the session, not only by the persona header', async () => {
    const { mock } = setup();
    const sdk = new Admin({ appUrl: 'http://qelos.mock', fetch: mock.fetch });
    await sdk.authentication.oAuthSignin({ username: 'admin@x.com', password: 'admin-pass' });
    assert.equal((await sdk.users.getList()).length, 2);
  });

  test('lists users with the fields the service selects (no email, no password) and filters them', async () => {
    const { admin, call } = setup();
    const all = await admin.users.getList();
    assert.equal(all.length, 2);
    for (const user of all) {
      assert.ok(user._id && user.username && user.roles);
      assert.equal('email' in user, false);
      assert.equal('passwordHash' in user || 'password' in user, false);
    }
    assert.deepEqual((await admin.users.getList({ username: 'ADMIN' })).map((u: any) => u.username), ['admin@x.com']);
    assert.deepEqual((await admin.users.getList({ roles: ['user'] })).map((u: any) => u.username), ['user@x.com']);
    const [first] = all;
    assert.equal(((await (await call('GET', `/api/users?users=${first._id}`)).json()) as any[]).length, 1);
    assert.equal(((await (await call('GET', `/api/users?_id=${first._id}`)).json()) as any[]).length, 1);
    assert.deepEqual(await (await call('GET', '/api/users/stats')).json(), { users: 2, workspaces: 0 });
  });

  test('reads one user with its internal metadata, and answers 404 for an unknown one', async () => {
    const { admin, call } = setup();
    const [first] = await admin.users.getList();
    assert.deepEqual((await admin.users.getUser(first._id)).internalMetadata, {});
    const missing = await call('GET', '/api/users/ffffffffffffffffffffffff');
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { message: 'user not exists' });
  });

  test('creates a user who can sign in', async () => {
    const { admin, mock, sdk } = setup();
    const created = await admin.users.create({ username: 'New User@X.com', password: 'fresh-pass', firstName: 'New', lastName: 'User', name: 'New User', internalMetadata: { plan: 'pro' } });
    assert.equal(created.username, 'new+user@x.com');
    assert.equal(created.name, 'New User');
    assert.deepEqual(created.roles, ['user']);
    assert.deepEqual(created.internalMetadata, { plan: 'pro' });
    assert.equal(JSON.stringify(mock.state.snapshot()).includes('fresh-pass'), false);
    await sdk.authentication.oAuthSignin({ username: 'new+user@x.com', password: 'fresh-pass' });
    assert.equal((await sdk.authentication.getLoggedInUser()).email, 'new+user@x.com');
  });

  test('rejects what the service rejects', async () => {
    const { call } = setup();
    const create = async (body: object) => {
      const res = await call('POST', '/api/users', body);
      return [res.status, ((await res.json()) as any).message];
    };
    assert.deepEqual(await create({ username: 'not-an-email', password: 'p' }), [400, 'username should be an email address']);
    assert.deepEqual(await create({ password: 'p' }), [400, 'username is required']);
    assert.deepEqual(await create({ username: 'user@x.com', password: 'p' }), [400, 'user creation failed']);
  });

  test('a tenant that signs in with usernames accepts them, and keeps only configured metadata', async () => {
    const { admin } = setup({
      personas,
      configurations: [{ key: 'auth-configuration', metadata: { treatUsernameAs: 'username', additionalUserFields: [{ key: 'team', valueType: 'string' }] } }],
    });
    const created = await admin.users.create({ username: 'grace', password: 'p', roles: ['editor'], metadata: { team: 'core', other: 'dropped' } });
    assert.equal(created.username, 'grace');
    assert.deepEqual(created.roles, ['editor']);
    assert.deepEqual((await admin.users.getUser(created._id)).metadata, { team: 'core' });
  });

  test('updates a user: merged internal metadata, new password, new roles', async () => {
    const { admin, sdk, call } = setup();
    const [user] = await admin.users.getList({ username: 'user@x.com' });
    await admin.users.update(user._id, { internalMetadata: { a: 1 } });
    const updated = await admin.users.update(user._id, { firstName: 'Grace', roles: ['editor'], password: 'changed-pass', internalMetadata: { b: 2 } });
    assert.deepEqual(updated.internalMetadata, { a: 1, b: 2 });
    assert.equal(updated.firstName, 'Grace');
    assert.deepEqual((await admin.users.getUser(user._id)).roles, ['editor']);
    await sdk.authentication.oAuthSignin({ username: 'user@x.com', password: 'changed-pass' });
    const unknown = await call('PUT', '/api/users/ffffffffffffffffffffffff', { roles: ['x'] });
    assert.equal(unknown.status, 500);
    assert.deepEqual(await unknown.json(), { message: 'user update failed' });
  });

  test('removes a user, who can then no longer act or sign in', async () => {
    const { admin, mock, sdk } = setup();
    const [user] = await admin.users.getList({ username: 'user@x.com' });
    await admin.users.remove(user._id);
    assert.equal((await admin.users.getList()).length, 1);
    assert.equal((await mock.fetch('/api/me', { headers: { [PERSONA_HEADER]: 'user@x.com' } })).status, 401);
    await assert.rejects(async () => {
      const result: any = await sdk.authentication.oAuthSignin({ username: 'user@x.com', password: 'user-pass' });
      if (!result?.payload?.token) throw new Error('not signed in');
    });
  });

  test('encrypted data is kept per user and per id, null when there is none', async () => {
    const { admin } = setup();
    const [user] = await admin.users.getList();
    assert.equal(await admin.users.getEncryptedData(user._id, 'vault'), null);
    await admin.users.setEncryptedData(user._id, 'vault', { secret: 1 });
    await admin.users.setEncryptedData(user._id, 'other', { secret: 2 });
    await admin.users.setEncryptedData(user._id, 'vault', { secret: 3 });
    assert.deepEqual(await admin.users.getEncryptedData(user._id, 'vault'), { secret: 3 });
    assert.deepEqual(await admin.users.getEncryptedData(user._id, 'other'), { secret: 2 });
    assert.equal(await admin.users.getEncryptedData('ffffffffffffffffffffffff', 'vault'), null);
    await assert.rejects(admin.users.setEncryptedData('ffffffffffffffffffffffff', 'vault', {}));
  });
});
