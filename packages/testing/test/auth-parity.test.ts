import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as adminModule from '@qelos/sdk/administrator';
import { createMockQelos, PERSONA_HEADER } from '../src/index.js';

// tsx loads the SDK as CommonJS: the class sits on `default` (twice, depending on the loader)
const loaded: any = adminModule;
const Admin: new (options: any) => any = loaded.default?.default ?? loaded.default ?? loaded;

const personas = [
  { _id: 'u-admin', email: 'admin@x.com', password: 'password-1', roles: ['admin'] },
  { _id: 'u-user', email: 'user@x.com', password: 'password-1', roles: ['user'], workspaces: [{ _id: 'ws-1', name: 'Acme', roles: ['lead'] }] },
];

function setup(configurations: object[] = [], extra: object = {}) {
  const mock = createMockQelos({ logger: () => {}, seed: { personas, configurations: configurations as any, ...extra } });
  const call = async (headers: string | Record<string, string> | null, method: string, path: string, body?: object) => {
    const res = await mock.fetch(path, {
      method,
      headers: typeof headers === 'string' ? { [PERSONA_HEADER]: `${headers}@x.com` } : (headers ?? {}),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  };
  return { mock, call };
}

describe('impersonation', () => {
  const as = (user: string, workspace?: string) => ({
    [PERSONA_HEADER]: 'admin@x.com',
    'x-impersonate-user': user,
    ...(workspace ? { 'x-impersonate-workspace': workspace } : {}),
  });

  test('an administrator is seen as the other user, with the workspace asked for', async () => {
    const { call } = setup();
    const me = (await call(as('u-user', 'ws-1'), 'GET', '/api/me')).body;
    assert.deepEqual([me.email, me.workspace._id, me.workspace.roles], ['user@x.com', 'ws-1', ['lead']]);
    assert.equal((await call(as('u-user'), 'GET', '/api/me')).body.workspace, null);
  });

  test('other services refuse what that user may not do; user management stays open', async () => {
    const { call } = setup();
    assert.equal((await call(as('u-user'), 'GET', '/api/components')).status, 401);
    assert.equal((await call(as('u-user'), 'GET', '/api/events')).status, 401);
    assert.equal((await call(as('u-user'), 'GET', '/api/users')).status, 200);
    assert.equal((await call(as('u-user'), 'GET', '/api/roles')).status, 200);
  });

  test('only administrators may; an unknown user or workspace leaves nobody signed in', async () => {
    const { call } = setup();
    const byUser = { [PERSONA_HEADER]: 'user@x.com', 'x-impersonate-user': 'u-admin' };
    assert.equal((await call(byUser, 'GET', '/api/me')).body.email, 'user@x.com');
    assert.equal((await call(as('nobody'), 'GET', '/api/me')).status, 401);
    assert.equal((await call(as('u-user', 'ws-none'), 'GET', '/api/components')).status, 401);
  });

  test('through the administrator SDK, also when signed in with a password', async () => {
    const { mock } = setup();
    const sdk = new Admin({ appUrl: 'http://qelos.mock', fetch: mock.fetch });
    await sdk.authentication.oAuthSignin({ username: 'admin@x.com', password: 'password-1' });
    sdk.impersonateUser('u-user', 'ws-1');
    assert.equal((await sdk.authentication.getLoggedInUser()).email, 'user@x.com');
    await assert.rejects(sdk.components.getList());
    sdk.clearImpersonation();
    assert.equal((await sdk.authentication.getLoggedInUser()).email, 'admin@x.com');
  });
});

describe('tenant settings', () => {
  const auth = (metadata: object) => ({ key: 'auth-configuration', metadata });
  const workspaces = (metadata: object) => ({ key: 'workspace-configuration', metadata });
  const token = { nickname: 'ci', expiresAt: new Date(Date.now() + 60_000).toISOString() };

  test('API tokens need the tenant to allow the caller, once it has an auth configuration', async () => {
    const create = async (configurations: object[]) => (await setup(configurations).call('user', 'POST', '/api/me/api-tokens', token)).status;
    assert.equal(await create([]), 201);
    assert.equal(await create([auth({})]), 403);
    assert.equal(await create([auth({ allowUserTokenAuthentication: true, tokenAuthenticationPermissions: { roles: ['admin'] } })]), 403);
    assert.equal(await create([auth({ allowUserTokenAuthentication: true, tokenAuthenticationPermissions: { wsRoles: ['lead'] } })]), 201);
  });

  test('a user holds at most ten API tokens, prefixed like real ones', async () => {
    const { call } = setup();
    for (let i = 0; i < 10; i++) assert.match((await call('user', 'POST', '/api/me/api-tokens', token)).body.token, /^ql_/);
    assert.equal((await call('user', 'POST', '/api/me/api-tokens', token)).status, 400);
  });

  test('a tenant with workspaces turned off signs users in without one', async () => {
    const { call } = setup([workspaces({ isActive: false })]);
    assert.equal((await call('user', 'GET', '/api/me')).body.workspace, null);
  });

  test('a workspace asked for at sign-in must be the user\'s', async () => {
    const { call } = setup();
    const signin = (workspace?: string) =>
      call(null, 'POST', '/api/signin', { username: 'user@x.com', password: 'password-1', authType: 'oauth', workspace });
    assert.equal((await signin()).body.payload.workspace._id, 'ws-1');
    assert.equal((await signin('ws-1')).body.payload.workspace._id, 'ws-1');
    assert.ok(!(await signin('ws-none')).body.payload.workspace);
  });

  test('who may create a workspace, and with which labels', async () => {
    const restricted = setup([workspaces({ creationPrivilegedRoles: ['admin'], allowNonLabeledWorkspaces: true })]);
    assert.equal((await restricted.call('user', 'POST', '/api/workspaces', { name: 'x' })).status, 403);
    assert.equal((await restricted.call('admin', 'POST', '/api/workspaces', { name: 'x' })).status, 200);
    const labelled = setup([workspaces({ labels: [{ title: 'Pro', value: ['pro'] }] })]);
    assert.equal((await labelled.call('user', 'POST', '/api/workspaces', { name: 'x' })).status, 400);
    assert.equal((await labelled.call('user', 'POST', '/api/workspaces', { name: 'x', labels: ['a', 'b'] })).status, 400);
    assert.equal((await labelled.call('user', 'POST', '/api/workspaces', { name: 'x', labels: ['pro'] })).status, 200);
  });
});

describe('workspaces and roles', () => {
  test('roles are the ones users have', async () => {
    const { call } = setup();
    assert.deepEqual((await call('admin', 'GET', '/api/roles')).body.sort(), ['admin', 'user']);
  });

  test('encrypted data per workspace, for administrators', async () => {
    const { mock, call } = setup();
    const sdk = new Admin({ appUrl: 'http://qelos.mock', fetch: mock.fetch, extraHeaders: async () => ({ [PERSONA_HEADER]: 'admin@x.com' }) });
    assert.equal(await sdk.adminWorkspaces.getEncryptedData('ws-1', 'vault'), null);
    await sdk.adminWorkspaces.setEncryptedData('ws-1', 'vault', { k: 1 });
    assert.deepEqual(await sdk.adminWorkspaces.getEncryptedData('ws-1', 'vault'), { k: 1 });
    assert.equal(await sdk.adminWorkspaces.getEncryptedData('ws-1', 'other'), null);
    assert.equal((await call('admin', 'GET', '/api/workspaces/none/encrypted')).status, 404);
    assert.equal((await call('user', 'GET', '/api/workspaces/ws-1/encrypted')).status, 401);
  });
});
