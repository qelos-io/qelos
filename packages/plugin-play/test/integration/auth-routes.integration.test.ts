import '../helpers/production-env';
import { after, before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { getApp } from '../../src/app';
import { setConfig } from '../../src/config';
import { addEndpoint } from '../../src/endpoints';
import { onFrontendUnAuthorization } from '../../src/handlers';
import { fakeTenant, type FakeTenant } from '../helpers/fake-tenant';
import { accessToken, refreshToken, secrets, tenantPayload, user } from '../helpers/tokens';

/**
 * The authentication routes of the plugin runtime, through the real Fastify app (`inject`, no sockets) with the
 * real SDK talking to a fake Qelos tenant (the plugin's own) and a fake customer tenant (the one registering).
 */
let own: FakeTenant;
let customer: FakeTenant;
const unauthorizeCalls: unknown[] = [];

before(async () => {
  own = await fakeTenant();
  customer = await fakeTenant({ pluginRoleFor: (username) => username.startsWith('plugin.') });
  setConfig({ ...secrets, dev: false, qelosUrl: own.url, qelosUsername: 'plugin', qelosPassword: 'pw', allowedTenants: ['127.0.0.1'] });
  addEndpoint('/protected', { verifyToken: true, handler: async (req) => ({ user: (req as any).user, tenant: (req as any).tenantPayload }) });
  onFrontendUnAuthorization((payload) => unauthorizeCalls.push(payload));
  await getApp().ready();
});

after(async () => {
  await Promise.all([own.close(), customer.close()]);
});

const app = () => getApp();
const json = (res: { body: string }) => JSON.parse(res.body);
const cookieOf = (res: any, name: string) => {
  const c = [res.headers['set-cookie']].flat().filter(Boolean).find((line: string) => line.startsWith(name + '='));
  return c ? c.split(';')[0].slice(name.length + 1) : undefined;
};

describe('the plugin signs in to its own tenant on startup', () => {
  test('through the SDK, before serving requests', async () => {
    // sign-in is started when the app is created and finishes asynchronously
    for (let i = 0; i < 50 && !own.log.includes('POST /api/signin'); i++) await new Promise((r) => setTimeout(r, 20));
    assert.ok(own.log.includes('POST /api/signin'));
  });
});

describe('POST /api/token/refresh', () => {
  const refresh = (token?: string) =>
    app().inject({ method: 'POST', url: '/api/token/refresh', headers: token ? { authorization: `Bearer ${token}` } : {} });

  test('without a refresh token answers 401 with the reason', async () => {
    const res = await refresh();
    assert.equal(res.statusCode, 401);
    assert.match(res.body, /expected refresh token is empty/);
  });

  test('a token signed with another secret answers the generic 401', async () => {
    const res = await refresh(refreshToken(tenantPayload, 'another-secret'));
    assert.equal(res.statusCode, 401);
    assert.deepEqual(json(res), { message: 'you are not authorized' });
  });

  test('a verified user gets a new access token and a new refresh token, and the identifier rotates', async () => {
    own.users.set('tenant-1', { _id: 'tenant-1', internalMetadata: { tokenIdentifier: 'abc123' } });
    const res = await refresh(refreshToken({ sub: 'tenant-1', identifier: 'abc123' }));
    assert.equal(res.statusCode, 200);
    const body = json(res);
    const access: any = jwt.verify(body.access_token, secrets.accessTokenSecret);
    const refreshed: any = jwt.verify(body.refresh_token, secrets.refreshTokenSecret);
    assert.equal(access.sub, 'tenant-1');
    assert.equal(refreshed.sub, 'tenant-1');
    assert.notEqual(refreshed.identifier, 'abc123');
    assert.equal(own.users.get('tenant-1').internalMetadata.tokenIdentifier, refreshed.identifier, 'the new identifier is stored on the tenant');
  });

  test('replaying an already used refresh token is rejected (identifiers are single use)', async () => {
    const res = await refresh(refreshToken({ sub: 'tenant-1', identifier: 'abc123' }));
    assert.equal(res.statusCode, 401);
    assert.match(res.body, /user is not verified/);
  });
});

describe('POST /api/register', () => {
  const register = (body: object) => app().inject({ method: 'POST', url: '/api/register', payload: body });
  const username = () => `plugin.t1@127.0.0.1`;

  test('rejects missing credentials with 401', async () => {
    const res = await register({ username: 'a@127.0.0.1' });
    assert.equal(res.statusCode, 401);
    assert.match(json(res).message, /^missing credentials/);
  });

  test('names exactly the missing fields', async () => {
    const cases: Array<[object, string]> = [
      [{}, 'missing credentials: username, password, appUrl'],
      [{ username: 'a@127.0.0.1' }, 'missing credentials: password, appUrl'],
      [{ username: 'a@127.0.0.1', password: 'pw' }, 'missing credentials: appUrl'],
      [{ password: 'pw', appUrl: 'http://x' }, 'missing credentials: username'],
      [{ username: 'a@127.0.0.1', password: '', appUrl: 'http://x' }, 'missing credentials: password'],
    ];
    for (const [body, message] of cases) {
      const res = await register(body);
      assert.equal(res.statusCode, 401);
      assert.equal(json(res).message, message, JSON.stringify(body));
    }
  });

  test('rejects a tenant that is not on the allow list', async () => {
    const res = await register({ username: 'plugin.t1@evil.example.com', password: 'pw', appUrl: 'https://evil.example.com' });
    assert.equal(res.statusCode, 401);
    assert.equal(json(res).message, 'your tenant is not allowed for this plugin');
  });

  test('rejects an email from another host than the app url', async () => {
    const res = await register({ username: 'plugin.t1@other.example.com', password: 'pw', appUrl: customer.url });
    assert.equal(res.statusCode, 401);
    assert.match(json(res).message, /email must be provided from the same app url/);
  });

  test('rejects a user that is not a plugin user on the customer tenant', async () => {
    const res = await register({ username: 'admin.t1@127.0.0.1', password: 'pw', appUrl: customer.url });
    assert.equal(res.statusCode, 401);
    assert.match(json(res).message, /should retrieve a plugin user/);
  });

  test('registers a tenant: signs in to it, stores the user and its encrypted credentials, answers with tokens', async () => {
    const res = await register({ username: username(), password: 'secret-pw', appUrl: customer.url });
    assert.equal(res.statusCode, 200);
    const body = json(res);
    const payload: any = jwt.verify(body.access_token, secrets.accessTokenSecret);
    jwt.verify(body.refresh_token, secrets.refreshTokenSecret);

    assert.ok(customer.log.includes('POST /api/signin'), 'it signed in to the customer tenant');
    const stored = [...own.users.values()].find((u) => u.username === username());
    assert.ok(stored, 'the tenant user was created on the plugin\'s own tenant');
    assert.deepEqual(stored.roles, ['user', 'qelos']);
    assert.equal(stored.firstName, customer.url);
    assert.equal(payload.sub, stored._id);
    assert.equal(own.encrypted.get(stored._id).appUrl, customer.url);
    assert.equal(own.encrypted.get(stored._id).username, username());
  });

  test('registering the same tenant again updates the user instead of creating a second one', async () => {
    const res = await register({ username: username(), password: 'new-pw', appUrl: customer.url });
    assert.equal(res.statusCode, 200);
    const matching = [...own.users.values()].filter((u) => u.username === username());
    assert.equal(matching.length, 1);
    assert.equal(matching[0].password, 'new-pw');
  });
});

describe('the frontend authorization handshake', () => {
  const returnUrl = 'http://front.test/page';
  const callbackHeaders = (u: object = user) => ({ authorization: `Bearer ${accessToken()}`, user: JSON.stringify(u) });
  const callback = (headers: Record<string, string>, target = returnUrl) =>
    app().inject({ method: 'GET', url: `/api/callback?returnUrl=${encodeURIComponent(Buffer.from(target).toString('base64'))}`, headers });

  let handshake: { code: string; token: string };
  let sessionCookie: string;

  test('callback without a valid access token is rejected', async () => {
    const res = await callback({});
    assert.notEqual(res.statusCode, 200);
  });

  test('callback with a plain JSON user header answers a code, a token and the return url carrying them', async () => {
    const res = await callback(callbackHeaders());
    assert.equal(res.statusCode, 200);
    handshake = json(res);
    assert.match(handshake.code, /^\d{1,3}$/);
    const back = new URL(json(res).returnUrl);
    assert.equal(back.searchParams.get('code'), handshake.code);
    assert.equal(back.searchParams.get('token'), handshake.token);
    const claims: any = jwt.verify(handshake.token, secrets.accessTokenSecret);
    assert.equal(claims.user.email, user.email);
    assert.equal(claims.tenant.sub, tenantPayload.sub);
  });

  test('callback also works with a base64 encoded user header, the same user as with plain JSON', async () => {
    const res = await callback({ authorization: `Bearer ${accessToken()}`, user: Buffer.from(JSON.stringify(user)).toString('base64') });
    assert.equal(res.statusCode, 200);
    const claims: any = jwt.verify(json(res).token, secrets.accessTokenSecret);
    assert.equal(claims.user.email, user.email);
    // a new callback for the same page and user replaces the cached code: the next steps continue with this one
    handshake = json(res);
  });

  test('callback without a user header still answers a code (anonymous callback)', async () => {
    const res = await callback({ authorization: `Bearer ${accessToken()}` });
    assert.equal(res.statusCode, 200);
    assert.equal(jwt.verify(json(res).token, secrets.accessTokenSecret) && (jwt.decode(json(res).token) as any).user, undefined);
  });

  test('callback with an invalid return url answers 401', async () => {
    const res = await app().inject({ method: 'GET', url: '/api/callback?returnUrl=not-base64-url', headers: callbackHeaders() });
    assert.equal(res.statusCode, 401);
  });

  test('authorize exchanges the token for a session cookie named after the code', async () => {
    const res = await app().inject({ method: 'POST', url: '/api/authorize', payload: { returnUrl, token: handshake.token } });
    assert.equal(res.statusCode, 200);
    assert.equal(json(res).user.email, user.email);
    sessionCookie = cookieOf(res, `token_${handshake.code}`)!;
    assert.ok(sessionCookie, 'a token_<code> cookie is set');
    const claims: any = jwt.verify(sessionCookie, secrets.accessTokenSecret);
    assert.equal(claims.code, handshake.code);
  });

  test('authorize without a token, or with a forged one, answers 401', async () => {
    const empty = await app().inject({ method: 'POST', url: '/api/authorize', payload: {} });
    assert.equal(empty.statusCode, 401);
    const forged = jwt.sign({ user, tenant: tenantPayload }, 'another-secret');
    const res = await app().inject({ method: 'POST', url: '/api/authorize', payload: { returnUrl, token: forged } });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(json(res), { message: 'you are not authorized' });
  });

  test('authorize for a page the callback never saw answers 401 (no cached code)', async () => {
    const res = await app().inject({ method: 'POST', url: '/api/authorize', payload: { returnUrl: 'http://front.test/other', token: handshake.token } });
    assert.equal(res.statusCode, 401);
  });

  test('a protected endpoint accepts the session cookie with its code and knows the user and tenant', async () => {
    const res = await app().inject({ method: 'GET', url: '/protected', headers: { code: handshake.code }, cookies: { [`token_${handshake.code}`]: sessionCookie } });
    assert.equal(res.statusCode, 200);
    assert.equal(json(res).user.email, user.email);
    assert.equal(json(res).tenant.sub, tenantPayload.sub);
  });

  test('a protected endpoint rejects a request without the cookie', async () => {
    const res = await app().inject({ method: 'GET', url: '/protected', headers: { code: handshake.code } });
    assert.notEqual(res.statusCode, 200);
  });

  test('un-authorize clears the cookie and tells the registered handlers', async () => {
    const res = await app().inject({ method: 'POST', url: '/api/un-authorize', headers: { code: handshake.code }, cookies: { [`token_${handshake.code}`]: sessionCookie } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'OK');
    assert.equal(cookieOf(res, `token_${handshake.code}`), '');
    assert.equal(unauthorizeCalls.length, 1);
    assert.equal((unauthorizeCalls[0] as any).user.email, user.email);
  });
});

describe('the handshake finds the code whatever identifies the user', () => {
  // in Qelos a username is required, an email is optional, and the two need not match
  const returnUrl = 'http://front.test/identity';
  const handshake = async (u: object) => {
    const back = await app().inject({
      method: 'GET',
      url: `/api/callback?returnUrl=${encodeURIComponent(Buffer.from(returnUrl).toString('base64'))}`,
      headers: { authorization: `Bearer ${accessToken()}`, user: JSON.stringify(u) },
    });
    assert.equal(back.statusCode, 200);
    const { code, token } = json(back);
    const res = await app().inject({ method: 'POST', url: '/api/authorize', payload: { returnUrl, token } });
    return { res, code };
  };

  for (const [label, u] of [
    ['a username that differs from the email', { ...user, _id: 'a', username: 'ada', email: 'ada@example.com' }],
    ['no email', { ...user, _id: 'b', username: 'grace', email: undefined }],
  ] as const) {
    test(`a user with ${label} is authorized`, async () => {
      const { res, code } = await handshake(u);
      assert.equal(res.statusCode, 200);
      assert.equal(json(res).user.username, u.username);
      assert.ok(cookieOf(res, `token_${code}`), 'the session cookie is set');
    });
  }

  test('two users with the same email each get their own code', async () => {
    const first = await handshake({ ...user, _id: 'c', username: 'shared-one', email: 'team@example.com' });
    const second = await handshake({ ...user, _id: 'd', username: 'shared-two', email: 'team@example.com' });
    assert.ok(cookieOf(first.res, `token_${first.code}`));
    assert.ok(cookieOf(second.res, `token_${second.code}`));
  });

  test('without a username there is still no session', async () => {
    const { res } = await handshake({ _id: 'e', email: 'nameless@example.com', roles: ['user'] });
    assert.equal(res.statusCode, 401);
  });

  test('an anonymous callback does not authorize a session', async () => {
    const back = await app().inject({
      method: 'GET',
      url: `/api/callback?returnUrl=${encodeURIComponent(Buffer.from(returnUrl).toString('base64'))}`,
      headers: { authorization: `Bearer ${accessToken()}` },
    });
    const res = await app().inject({ method: 'POST', url: '/api/authorize', payload: { returnUrl, token: json(back).token } });
    assert.equal(res.statusCode, 401);
  });
});
