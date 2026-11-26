import '../helpers/production-env';
import { before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { getApp } from '../../src/app';
import { setConfig } from '../../src/config';
import { onRefreshToken } from '../../src/handlers';
import { refreshToken, secrets, tenantPayload } from '../helpers/tokens';

/**
 * A plugin without Qelos credentials, bringing its own refresh token handler. It used to try to sign in anyway
 * and end the process (`process.exit(1)`) a moment after the app was created.
 */
const requests: string[] = [];
const handled: unknown[] = [];

before(async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) => {
    requests.push(String(input));
    return realFetch(input, init);
  }) as typeof fetch;
  setConfig({ ...secrets, dev: false, qelosUrl: undefined, qelosUsername: undefined, qelosPassword: undefined, qelosApiToken: undefined });
  onRefreshToken(async (payload) => {
    handled.push(payload);
    return { payload: { sub: payload.sub, identifier: 'rotated' } };
  });
  await getApp().ready();
  // give a startup sign-in the time to fail, which is what used to end the process
  await new Promise((r) => setTimeout(r, 200));
});

describe('a plugin configured with its own refresh handler and no Qelos credentials', () => {
  test('starts, and does not try to sign in anywhere', () => {
    assert.deepEqual(requests, []);
  });

  test('serves its manifest', async () => {
    const res = await getApp().inject({ method: 'GET', url: '/api/play-manifest' });
    assert.equal(res.statusCode, 200);
  });

  test('refreshes tokens with the handler it was given', async () => {
    const res = await getApp().inject({ method: 'POST', url: '/api/token/refresh', headers: { authorization: `Bearer ${refreshToken()}` } });
    assert.equal(res.statusCode, 200);
    const access: any = jwt.verify(JSON.parse(res.body).access_token, secrets.accessTokenSecret);
    assert.equal(access.sub, tenantPayload.sub);
    assert.equal(access.identifier, 'rotated');
    assert.equal(handled.length, 1);
  });

  test('registration has no tenant handler to run, so it is refused', async () => {
    const res = await getApp().inject({ method: 'POST', url: '/api/register', payload: { username: 'a@x.com', password: 'p', appUrl: 'https://x.com' } });
    assert.equal(res.statusCode, 401);
  });
});
