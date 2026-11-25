import assert from 'node:assert/strict';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { createQelosMiddleware } from './middleware';
import { getQelosMock } from './mock';
import { createRequestSdk } from './sdk-factory';
import { createQelosApiProxyHandlers } from './runtime/api-proxy';
import { QELOS_USER_HEADER } from './types';

const FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/testing/test/fixtures/dump',
);

function mockConfig() {
  return {
    appUrl: 'http://unreachable.invalid',
    mock: {
      artifactsDir: FIXTURE,
      logger: () => {},
      seed: {
        blueprints: [{ identifier: 'product', name: 'Product' }],
        personas: [{ email: 'dev@example.com', password: 'secret-pass-1', roles: ['admin'] }],
      },
    },
  };
}

test('mock mode serves /api/** from the mock without upstream', async () => {
  const config = mockConfig();
  const handlers = createQelosApiProxyHandlers(config);
  assert.equal(handlers.mock.active, true);

  const signin = await handlers.POST(
    new NextRequest('http://localhost:3000/api/signin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'dev@example.com', password: 'secret-pass-1' }),
    }),
  );
  assert.equal(signin.status, 200);
  const cookies = signin.headers.getSetCookie();
  assert.ok(cookies.length >= 1);
  const cookie = cookies.map((c) => c.split(';')[0]).join('; ');

  const me = await handlers.GET(new NextRequest('http://localhost:3000/api/me', { headers: { cookie } }));
  assert.equal(me.status, 200);
  assert.equal(((await me.json()) as any).email, 'dev@example.com');

  const entities = await handlers.GET(
    new NextRequest('http://localhost:3000/api/blueprints/product/entities', { headers: { cookie } }),
  );
  assert.equal(entities.status, 200);
  const body: any = await entities.json();
  const list = Array.isArray(body) ? body : body.entities ?? body.items;
  assert.ok(list.length >= 2);

  const state = (await getQelosMock(config).get())!.state;
  assert.ok(state.entities.list('product').length >= 2);
});

test('middleware resolves the user from the mock', async () => {
  const config = { ...mockConfig(), disableProxy: true };
  const handlers = createQelosApiProxyHandlers(config);
  const signin = await handlers.POST(
    new NextRequest('http://localhost:3000/api/signin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'dev@example.com', password: 'secret-pass-1' }),
    }),
  );
  const cookie = signin.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const res = await createQelosMiddleware({ config })(
    new NextRequest('http://localhost:3000/dashboard', { headers: { cookie } }),
  );
  assert.ok(res.headers.get(`x-middleware-request-${QELOS_USER_HEADER}`));
});

test('createRequestSdk uses the mock when active', async () => {
  const sdk = createRequestSdk({ config: mockConfig(), getHeaders: () => ({}) });
  const list: any = await sdk.entities('product').getList();
  assert.ok(list.length >= 2);
});

test('mock is ignored in production unless allowInProduction', async () => {
  const prev = process.env.NODE_ENV;
  (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
  const warn = console.warn;
  console.warn = () => {};
  try {
    const mock = getQelosMock(mockConfig());
    assert.equal(mock.active, false);
    assert.equal(await mock.get(), null);
    const forced = getQelosMock({ appUrl: 'http://x.invalid', mock: { ...mockConfig().mock, allowInProduction: true } });
    assert.equal(forced.active, true);
  } finally {
    console.warn = warn;
    if (prev === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
    else (process.env as Record<string, string | undefined>).NODE_ENV = prev;
  }
});

test('without mock config the proxy still reports not configured', async () => {
  const handlers = createQelosApiProxyHandlers({ appUrl: '' });
  assert.equal(handlers.mock.active, false);
  const res = await handlers.GET(new NextRequest('http://localhost:3000/api/me'));
  assert.equal(res.status, 503);
});
