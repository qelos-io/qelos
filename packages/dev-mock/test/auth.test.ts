import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as sdkModule from '@qelos/sdk';
import {
  authenticate,
  checkBlueprintPermission,
  checkPermission,
  cookieTokenName,
  createMockQelos,
  decodeToken,
  PERSONA_HEADER,
  scopeMatches,
  type CreateMockQelosOptions,
} from '../src/index.js';

// the SDK build is CommonJS: the class sits on `default` (twice, depending on the loader)
const sdkExports: any = sdkModule;
const QelosSDK: new (options: any) => any = sdkExports.default?.default ?? sdkExports.default ?? sdkExports;

const APP_URL = 'http://qelos.mock';
const quiet = { logger: () => {} };

/**
 * An SDK instance bound to a mock. Without `headers` the SDK manages its own bearer token;
 * with `headers` it sends exactly those (no token, e.g. persona based calls).
 */
function sdkFor(mock: ReturnType<typeof createMockQelos>, headers?: Record<string, string>) {
  return new QelosSDK({
    appUrl: APP_URL,
    fetch: mock.fetch as any,
    ...(headers ? { extraHeaders: async () => ({ ...headers }) } : {}),
  });
}

function setup(options: CreateMockQelosOptions = {}, headers?: Record<string, string>) {
  const mock = createMockQelos({ ...quiet, ...options });
  return { mock, sdk: sdkFor(mock, headers) };
}

const signupData = (email: string, extra = {}) => ({
  username: email,
  email,
  password: 'password-123',
  firstName: 'Ada',
  lastName: 'Lovelace',
  birthDate: '1990-01-01',
  ...extra,
});

const personas = [
  {
    email: 'admin@example.com',
    password: 'admin-pass',
    name: 'Ada Admin',
    roles: ['admin'],
    workspaces: [{ name: 'Acme', labels: ['company'], roles: ['admin', 'user'] }],
  },
  {
    email: 'member@example.com',
    name: 'Mia Member',
    roles: ['user'],
    workspaces: [{ name: 'Acme', roles: ['member', 'user'] }],
  },
];

test('sign-up, me, update profile and sign-out (oauth flow)', async () => {
  const { sdk, mock } = setup();
  const signedUp = await sdk.authentication.oAuthSignup(signupData('new@example.com') as any);
  assert.equal(signedUp.payload.user.email, 'new@example.com');
  assert.ok(signedUp.payload.token && signedUp.payload.refreshToken);
  assert.equal(mock.state.users.size, 1);
  assert.ok(!JSON.stringify(mock.state.snapshot()).includes('password-123'));

  const me = await sdk.authentication.getLoggedInUser();
  assert.equal(me.email, 'new@example.com');
  assert.equal(me.firstName, 'Ada');
  assert.deepEqual(me.roles, ['user']);

  const updated = await sdk.authentication.updateLoggedInUser({ firstName: 'Grace', metadata: { theme: 'dark' } });
  assert.equal(updated.firstName, 'Grace');
  assert.equal((await sdk.authentication.getLoggedInUser()).metadata.theme, 'dark');

  assert.equal((await sdk.authentication.logout()).status, 200);
  await assert.rejects(() => sdk.authentication.getLoggedInUser(), /not authorized/);
});

test('sign-up validation and duplicates use the real service error shapes', async () => {
  const { sdk } = setup();
  const bad: any = await sdk.authentication.signup({ ...signupData('nope'), password: 'short' } as any);
  assert.equal(bad.errors.email.code, 'INVALID_EMAIL');
  assert.equal(bad.errors.password.code, 'INVALID_PASSWORD');

  await sdk.authentication.signup(signupData('dup@example.com') as any);
  const dup: any = await sdk.authentication.signup(signupData('DUP@example.com') as any);
  assert.deepEqual(dup, { errors: { email: 'DUPLICATED_EMAIL' } });
});

test('sign-in (cookie flow) sets the real cookie name; bad credentials are rejected', async () => {
  const { sdk, mock } = setup();
  await sdk.authentication.signup(signupData('cookie@example.com') as any);

  const ok = await sdk.authentication.signin({ username: 'cookie@example.com', password: 'password-123' });
  const setCookie = ok.headers['set-cookie']!;
  assert.match(setCookie, new RegExp(`^${cookieTokenName(mock.state)}=`));
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Path=\/api/);
  assert.equal(cookieTokenName(mock.state), 'qlt_0');

  // the cookie authenticates later requests
  const cookie = setCookie.split(';')[0];
  const me: any = await (await mock.fetch('/api/me', { headers: { cookie } })).json();
  assert.equal(me.email, 'cookie@example.com');

  await assert.rejects(() => sdk.authentication.signin({ username: 'cookie@example.com', password: 'wrong-pass' }), /failed to login/);
  const res = await mock.fetch('/api/signin', {
    method: 'POST',
    body: JSON.stringify({ username: 'ghost@example.com', password: 'whatever1' }),
  });
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { errors: { general: { message: 'Invalid username or password' } } });
  const empty = await mock.fetch('/api/signin', { method: 'POST', body: JSON.stringify({ username: 'x' }) });
  assert.equal(empty.status, 401);
  assert.deepEqual(await empty.json(), { errors: { password: { code: 'EMPTY_PASSWORD' } } });
});

test('refresh rotates tokens and expired/used tokens are rejected', async () => {
  const { sdk, mock } = setup();
  const { payload } = await sdk.authentication.oAuthSignup(signupData('refresh@example.com') as any);
  const oldRefresh = payload.refreshToken;
  assert.equal(decodeToken(payload.token)?.sub, mock.state.users.list()[0]._id);

  const refreshed = await sdk.authentication.refreshToken();
  assert.notEqual(refreshed.payload.token, payload.token);
  assert.notEqual(refreshed.payload.refreshToken, oldRefresh);
  assert.equal((await sdk.authentication.getLoggedInUser()).email, 'refresh@example.com');

  // the previous refresh token is single use
  const reuse = await mock.fetch('/api/token/refresh', { method: 'POST', headers: { authorization: `Bearer ${oldRefresh}` } });
  assert.equal(reuse.status, 401);

  // expiry
  const access = mock.state.sessions.list((s) => s.kind === 'access').at(-1)!;
  mock.state.sessions.update(access._id, { expiresAt: Date.now() - 1 });
  const expired = await mock.fetch('/api/me', { headers: { authorization: `Bearer ${refreshed.payload.token}` } });
  assert.equal(expired.status, 401);
});

test('cookie refresh and social callback exchange', async () => {
  const { sdk, mock } = setup({}, {});
  await sdk.authentication.signup(signupData('c2@example.com') as any);
  const signin = await sdk.authentication.signin({ username: 'c2@example.com', password: 'password-123' });
  const token = decodeURIComponent(signin.headers['set-cookie']!.split(';')[0].split('=')[1]);

  const refreshed = await sdk.authentication.refreshCookieToken(token);
  assert.ok(refreshed.payload.cookieToken);
  assert.notEqual(refreshed.payload.cookieToken, token);
  await assert.rejects(() => sdk.authentication.refreshCookieToken(token), /failed to refresh cookie token/);

  const login = await mock.fetch('/api/auth/github?returnUrl=/done');
  assert.equal(login.status, 302);
  const location = new URL(login.headers.get('location')!);
  assert.equal(location.pathname, '/done');
  const exchanged = await sdk.authentication.socialCallback(location);
  assert.ok(exchanged.headers['set-cookie']);
  assert.ok(exchanged.payload.user.email);
});

test('workspaces: create, invite, accept, list members, roles and activate', async () => {
  const { mock, sdk: owner } = setup();
  const ownerSession = await owner.authentication.oAuthSignup(signupData('owner@example.com') as any);

  const ws = await owner.workspaces.create({ name: 'Team', labels: ['startup'] });
  assert.equal(ws.name, 'Team');
  assert.equal(ws.members![0].roles.includes('admin'), true);
  assert.equal((await owner.workspaces.getList()).length, 1);

  // invite -> the invitee sees and accepts it
  await owner.workspaces.inviteUser(ws._id as string, 'guest@example.com');
  const withInvite = await owner.workspaces.getWorkspace(ws._id as string);
  assert.equal(withInvite.invites![0].email, 'guest@example.com');
  assert.deepEqual(withInvite.invites![0].roles, ['member']);
  assert.equal((await owner.workspaces.listInvites(ws._id as string)).length, 1);

  const guestSdk = sdkFor(mock);
  await guestSdk.authentication.oAuthSignup(signupData('guest@example.com', { firstName: 'Gus' }) as any);
  const invites = await guestSdk.invites.getList();
  assert.equal(invites.length, 1);
  assert.equal(((await guestSdk.invites.acceptWorkspace(ws._id as string)) as Response).status, 200);

  const members = await owner.workspaces.getMembers(ws._id as string);
  assert.equal(members.length, 2);
  assert.equal((await owner.workspaces.getWorkspace(ws._id as string)).invites!.length, 0);

  // guest is a plain member: cannot list members nor update
  await assert.rejects(() => guestSdk.workspaces.getMembers(ws._id as string), /not authorized/);
  await assert.rejects(() => guestSdk.workspaces.update(ws._id as string, { name: 'Hacked' }), /not authorized/);
  assert.equal((await guestSdk.workspaces.getList()).length, 1);

  const guestId = mock.state.users.findOne((u) => u.email === 'guest@example.com')!._id;
  const roleUpdate = await owner.workspaces.updateMemberRoles(ws._id as string, guestId, ['admin', 'user']);
  assert.deepEqual(roleUpdate.updatedMember!.roles, ['admin', 'user']);
  assert.equal((await guestSdk.workspaces.getMembers(ws._id as string)).length, 2);
  await owner.workspaces.removeMember(ws._id as string, guestId);
  assert.equal((await owner.workspaces.getMembers(ws._id as string)).length, 1);

  // update + activate + delete rules
  assert.equal((await owner.workspaces.update(ws._id as string, { name: 'Renamed' })).name, 'Renamed');
  const second = await owner.workspaces.create({ name: 'Second' });
  await owner.workspaces.activate(second._id as string);
  assert.equal((await owner.authentication.getLoggedInUser()).workspace?._id, second._id);
  await assert.rejects(() => owner.workspaces.getWorkspace('f'.repeat(24)), /workspace not found/);
  assert.equal((await owner.workspaces.remove(ws._id as string)).status, 200);
  assert.equal((await owner.workspaces.getList()).length, 1);
  assert.ok(ownerSession.payload.token);
});

test('default persona auto-login with header override', async () => {
  const options = { seed: { personas }, defaultPersona: 'admin@example.com' };
  const { sdk, mock } = setup(options, {});

  const me = await sdk.authentication.getLoggedInUser();
  assert.equal(me.email, 'admin@example.com');
  assert.equal(me.name, 'Ada Admin');
  assert.deepEqual(me.roles, ['admin']);
  assert.equal(me.workspace?.name, 'Acme');
  assert.deepEqual(me.workspace?.labels, ['company']);

  const asMember = { sdk: sdkFor(mock, { [PERSONA_HEADER]: 'member@example.com' }) };
  const memberMe = await asMember.sdk.authentication.getLoggedInUser();
  assert.equal(memberMe.email, 'member@example.com');
  assert.deepEqual(memberMe.workspace?.roles, ['member', 'user']);
  // both personas share the single seeded workspace
  assert.equal(mock.state.workspaces.size, 1);
  assert.equal((await sdk.workspaces.getMembers(me.workspace!._id)).length, 2);
  await assert.rejects(() => asMember.sdk.workspaces.getMembers(me.workspace!._id), /not authorized/);

  // unknown persona -> unauthenticated; the cookie selector works too
  const ghost = await mock.fetch('/api/me', { headers: { [PERSONA_HEADER]: 'ghost' } });
  assert.equal(ghost.status, 401);
  const picked = await mock.fetch('/api/mock/persona', { method: 'POST', body: JSON.stringify({ persona: 'member@example.com' }) });
  const cookie = picked.headers.get('set-cookie')!.split(';')[0];
  assert.equal(((await (await mock.fetch('/api/me', { headers: { cookie } })).json()) as any).email, 'member@example.com');

  // personas can sign in with their seeded password; passwordless ones accept any password
  const noDefault = setup({ seed: { personas } }, {});
  assert.equal((await noDefault.mock.fetch('/api/me')).status, 401);
  await assert.rejects(() => noDefault.sdk.authentication.signin({ username: 'admin@example.com', password: 'bad' }), /failed to login/);
  await noDefault.sdk.authentication.signin({ username: 'admin@example.com', password: 'admin-pass' });
  await noDefault.sdk.authentication.signin({ username: 'member@example.com', password: 'anything' });
});

test('permissions from roles, api tokens and the authenticate helper', async () => {
  const seed = { personas, roles: { user: ['reports:read'], member: [], admin: ['*'] } };
  const { mock, sdk } = setup({ seed, defaultPersona: 'member@example.com' }, {});

  const request = (headers?: Record<string, string>) => new Request('http://x/api/me', { headers });
  const member = authenticate(request(), mock.state)!;
  assert.equal(member.user.email, 'member@example.com');
  assert.equal(member.session.kind, 'persona');
  assert.equal(member.workspace?.name, 'Acme');
  assert.equal(checkPermission(member, mock.state, 'reports:read'), true);
  assert.equal(checkPermission(member, mock.state, ['reports:read', 'reports:write']), false);
  const admin = authenticate(request({ [PERSONA_HEADER]: 'admin@example.com' }), mock.state)!;
  assert.equal(checkPermission(admin, mock.state, 'anything:at-all'), true);
  assert.equal(authenticate(request({ authorization: 'Bearer junk' }), mock.state), null);

  const perms: any = await (await mock.fetch('/api/me/permissions')).json();
  assert.deepEqual(perms.permissions, ['reports:read']);
  const check: any = await (
    await mock.fetch('/api/permissions/check', { method: 'POST', body: JSON.stringify({ permissions: ['reports:read', 'x:y'] }) })
  ).json();
  assert.deepEqual(check.results, { 'reports:read': true, 'x:y': false });
  assert.equal(check.allowed, false);

  // blueprint permission descriptors + scopes
  const blueprint = {
    permissionScope: 'workspace',
    permissions: [
      { operation: 'read', guest: false, roleBased: [], workspaceRoleBased: ['member'], workspaceLabelsBased: [] },
      { operation: 'create', scope: 'user', roleBased: ['admin'] },
      { operation: 'delete', guest: true },
    ],
  };
  assert.equal(checkBlueprintPermission(member, mock.state, blueprint, 'read'), 'workspace');
  assert.equal(checkBlueprintPermission(member, mock.state, blueprint, 'create'), null);
  assert.equal(checkBlueprintPermission(admin, mock.state, blueprint, 'create'), 'user');
  assert.equal(checkBlueprintPermission(null, mock.state, blueprint, 'delete'), 'workspace');
  assert.equal(checkBlueprintPermission(null, mock.state, blueprint, 'read'), null);
  assert.equal(scopeMatches(member, 'workspace', { workspace: member.workspace!._id }), true);
  assert.equal(scopeMatches(member, 'workspace', { workspace: 'other' }), false);
  assert.equal(scopeMatches(member, 'user', { user: member.user._id }), true);
  assert.equal(scopeMatches(null, 'tenant', {}), true);

  // API tokens (created by an authenticated user, used through the SDK)
  const created = await sdk.authentication.createApiToken({
    nickname: 'ci',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  });
  assert.equal((await sdk.authentication.listApiTokens())[0].nickname, 'ci');
  const tokenSdk = new QelosSDK({ appUrl: APP_URL, fetch: mock.fetch as any, apiToken: created.token });
  const tokenMe = await tokenSdk.authentication.apiTokenSignin(created.token);
  assert.equal(tokenMe.email, 'member@example.com');
  assert.equal(mock.state.apiTokens.list()[0].usageCount, 1);
  await assert.rejects(() => tokenSdk.authentication.listApiTokens(), /not allowed via token authentication/);
  await sdk.authentication.deleteApiToken(created.apiToken._id);
  await assert.rejects(() => tokenSdk.authentication.getLoggedInUser(), /not authorized/);
});

test('personal workspace on sign-up (option)', async () => {
  const { sdk } = setup({ auth: { personalWorkspace: true } });
  const res = await sdk.authentication.oAuthSignup(signupData('solo@example.com') as any);
  assert.match(res.payload.workspace!.name, /Ada's workspace/);
  assert.equal((await sdk.workspaces.getList()).length, 1);
});

test('state persists to JSON files and survives a restart', async () => {
  const dataDir = mkdtempSync(join(tmpdir(), 'qelos-mock-auth-'));
  const first = setup({ dataDir, seed: { personas } });
  const { payload } = await first.sdk.authentication.oAuthSignup(signupData('persist@example.com') as any);
  const ws = await first.sdk.workspaces.create({ name: 'Persisted' });
  await first.sdk.workspaces.inviteUser(ws._id as string, 'later@example.com');
  await first.mock.state.flush();

  const second = setup({ dataDir, seed: { personas } });
  // same tokens keep working: sessions were persisted
  const sdk = new QelosSDK({ appUrl: APP_URL, fetch: second.mock.fetch as any, accessToken: payload.token });
  assert.equal((await sdk.authentication.getLoggedInUser()).email, 'persist@example.com');
  assert.equal((await sdk.workspaces.getWorkspace(ws._id as string)).invites![0].email, 'later@example.com');
  await sdk.authentication.signin({ username: 'persist@example.com', password: 'password-123' });
  // seeded personas are not duplicated by the restart
  assert.equal(second.mock.state.users.list((u) => u.email === 'admin@example.com').length, 1);
  assert.equal(second.mock.state.workspaces.list((w) => w.name === 'Acme').length, 1);
});
