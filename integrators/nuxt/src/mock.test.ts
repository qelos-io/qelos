import assert from 'node:assert/strict';
import * as http from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3';
import { createQelosMiddleware } from './middleware';
import { getQelosMock } from './mock';
import { createMockApiHandler } from './mock-handler';
import { createRequestSdk } from './sdk-factory';

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

function listen(config: ReturnType<typeof mockConfig> | { appUrl: string }, withMiddleware = true) {
  const app = createApp();
  const router = createRouter();
  if (withMiddleware) {
    app.use(createQelosMiddleware({ config: { ...config, skipPaths: ['/api/'] } }));
  }
  router.get(
    '/whoami',
    defineEventHandler(async (event) => {
      const u: any = await event.context.qelos!.sdk.authentication.getLoggedInUser();
      return { ctx: event.context.qelos!.user?.email ?? null, sdk: u?.email ?? null };
    }),
  );
  router.use('/api/**', createMockApiHandler(config as any));
  app.use(router);
  const server = http.createServer(toNodeListener(app));
  return new Promise<{ server: http.Server; base: string }>((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ server, base: `http://127.0.0.1:${addr.port}` });
    }),
  );
}

test('mock mode serves /api/** from the mock without upstream', async () => {
  const config = mockConfig();
  const { server, base } = await listen(config);
  try {
    const signin = await fetch(`${base}/api/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'dev@example.com', password: 'secret-pass-1' }),
    });
    assert.equal(signin.status, 200);
    const cookies = signin.headers.getSetCookie();
    assert.ok(cookies.length >= 1);
    const cookie = cookies.map((c) => c.split(';')[0]).join('; ');

    const me = await fetch(`${base}/api/me`, { headers: { cookie } });
    assert.equal(me.status, 200);
    assert.equal(((await me.json()) as any).email, 'dev@example.com');

    const entities = await fetch(`${base}/api/blueprints/product/entities`, { headers: { cookie } });
    assert.equal(entities.status, 200);
    const body: any = await entities.json();
    const list = Array.isArray(body) ? body : body.entities ?? body.items;
    assert.ok(list.length >= 2);

    const who: any = await (await fetch(`${base}/whoami`, { headers: { cookie } })).json();
    assert.equal(who.ctx, 'dev@example.com');
    assert.equal(who.sdk, 'dev@example.com');

    const state = (await getQelosMock(config).get())!.state;
    assert.ok(state.entities.list('product').length >= 2);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('createRequestSdk uses the mock when active', async () => {
  const sdk = createRequestSdk({ config: mockConfig(), event: { node: { req: { headers: {} } } } as any });
  const list: any = await sdk.entities('product').getList();
  assert.ok(list.length >= 2);
});

test('mock is ignored in production unless allowInProduction', async () => {
  const env = process.env as Record<string, string | undefined>;
  const prev = env.NODE_ENV;
  env.NODE_ENV = 'production';
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
    if (prev === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = prev;
  }
});

test('without mock config nothing is served from the mock', async () => {
  assert.equal(getQelosMock({ appUrl: 'http://example.test' }).active, false);
});
