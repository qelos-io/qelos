import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { test } from 'node:test';
import Fastify from './fastify';
import qelosFastify from '../src/plugin';
import { createRequestSdk } from '../src/sdk-factory';
import { getQelosMock } from '../src/mock';

const FIXTURE = path.resolve(__dirname, '../../../packages/dev-mock/test/fixtures/dump');

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
  const app = Fastify();
  await app.register(qelosFastify, { config });
  app.get('/whoami', async (request) => {
    const u: any = await request.qelos.sdk.authentication.getLoggedInUser();
    return { ctx: request.qelos.user?.email ?? null, sdk: u?.email ?? null };
  });
  try {
    assert.equal(app.qelosMock.active, true);

    const signin = await app.inject({
      method: 'POST',
      url: '/api/signin',
      payload: { username: 'dev@example.com', password: 'secret-pass-1' },
    });
    assert.equal(signin.statusCode, 200);
    const setCookie = ([] as string[]).concat(signin.headers['set-cookie'] as string | string[]);
    assert.ok(setCookie.length >= 1);
    const cookie = setCookie.map((c) => c.split(';')[0]).join('; ');

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    assert.equal(me.statusCode, 200);
    assert.equal((me.json() as any).email, 'dev@example.com');

    const entities = await app.inject({ method: 'GET', url: '/api/blueprints/product/entities', headers: { cookie } });
    assert.equal(entities.statusCode, 200);
    const body: any = entities.json();
    const list = Array.isArray(body) ? body : body.entities ?? body.items;
    assert.ok(list.length >= 2);

    const who = (await app.inject({ method: 'GET', url: '/whoami', headers: { cookie } })).json() as any;
    assert.equal(who.ctx, 'dev@example.com');
    assert.equal(who.sdk, 'dev@example.com');

    const state = (await app.qelosMock.get())!.state;
    assert.ok(state.entities.list('product').length >= 2);
  } finally {
    await app.close();
  }
});

test('createRequestSdk uses the mock when active', async () => {
  const config = mockConfig();
  const sdk = createRequestSdk({ config, request: { headers: {} } as any });
  const list: any = await sdk.entities('product').getList();
  assert.ok(list.length >= 2);
});

test('mock is ignored in production unless allowInProduction', async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
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
    if (prev === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prev;
  }
});

test('without mock config the proxy still reports not configured', async () => {
  const app = Fastify();
  await app.register(qelosFastify, { config: { appUrl: '' } });
  try {
    assert.equal(app.qelosMock.active, false);
    const res = await app.inject({ method: 'GET', url: '/api/me' });
    assert.equal(res.statusCode, 503);
  } finally {
    await app.close();
  }
});
