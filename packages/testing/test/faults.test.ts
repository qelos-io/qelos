import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSdk } from '../src/sdk/index.js';
import { createMockQelos } from '../src/index.js';

const quiet = { logger: () => {}, seed: { personas: [{ email: 'a@x.com', password: 'pw', roles: ['admin'] }] } };

test('fail: answers with the status for matching requests, times limits it, handle counts and removes', async () => {
  const mock = createMockQelos(quiet);
  const h = mock.faults.fail('GET /api/me', 503, { times: 2, headers: { 'retry-after': '1' } });
  const get = () => mock.fetch('/api/me', { headers: { 'x-qelos-mock-persona': 'a@x.com' } });
  assert.equal((await get()).status, 503);
  assert.equal((await get()).headers.get('retry-after'), '1');
  assert.equal((await get()).status, 200);
  assert.deepEqual([h.matched, h.applied], [3, 2]);
  mock.faults.fail('/api/me', 500).remove();
  assert.equal((await get()).status, 200);
});

test('after, wildcard patterns, method filter and clear', async () => {
  const mock = createMockQelos(quiet);
  mock.faults.fail('POST /api/**', 502, { after: 1 });
  const post = () => mock.fetch('/api/blueprints/x/entities', { method: 'POST', body: '{}' });
  assert.notEqual((await post()).status, 502);
  assert.equal((await post()).status, 502);
  assert.notEqual((await mock.fetch('/api/blueprints/x/entities')).status, 502); // GET unaffected
  mock.faults.clear();
  assert.notEqual((await post()).status, 502);
});

test('slow delays but still answers; drop rejects like a network error', async () => {
  const mock = createMockQelos(quiet);
  mock.faults.slow('/api/me', 60);
  const t = Date.now();
  const res = await mock.fetch('/api/me', { headers: { 'x-qelos-mock-persona': 'a@x.com' } });
  assert.ok(Date.now() - t >= 50);
  assert.equal(res.status, 200);
  mock.faults.clear();
  mock.faults.drop('/api/me');
  await assert.rejects(() => mock.fetch('/api/me'), TypeError);
});

test('probability 0 never applies the fault', async () => {
  const mock = createMockQelos(quiet);
  const never = mock.faults.fail('/api/nope', 500, { probability: 0 });
  await mock.fetch('/api/nope');
  assert.equal(never.applied, 0);
});

test('rateLimit answers 429 with retry-after after the limit', async () => {
  const mock = createMockQelos(quiet);
  mock.faults.rateLimit('/api/me', { limit: 2, windowMs: 60_000 });
  const get = () => mock.fetch('/api/me', { headers: { 'x-qelos-mock-persona': 'a@x.com' } });
  assert.equal((await get()).status, 200);
  assert.equal((await get()).status, 200);
  const limited = await get();
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
});

test('expireAccessTokens rejects the access token (refresh still works); expireAllSessions kills refresh too', async () => {
  const { sdk, mock } = createMockSdk(quiet);
  await sdk.authentication.oAuthSignin({ username: 'a@x.com', password: 'pw' });
  assert.equal((await sdk.authentication.getLoggedInUser()).email, 'a@x.com');
  assert.ok(mock.faults.expireAccessTokens() >= 1);
  await assert.rejects(() => sdk.authentication.getLoggedInUser(), /not authorized/);
  await sdk.authentication.refreshToken();
  assert.equal((await sdk.authentication.getLoggedInUser()).email, 'a@x.com');
  mock.faults.expireAllSessions();
  await assert.rejects(() => sdk.authentication.getLoggedInUser());
  await assert.rejects(() => sdk.authentication.refreshToken());
});

test('createMockSdk reset() clears fault rules', async () => {
  const { mock, reset } = createMockSdk(quiet);
  mock.faults.fail('/api/me', 500);
  reset();
  assert.notEqual((await mock.fetch('/api/me')).status, 500);
});
