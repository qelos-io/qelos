import * as assert from 'node:assert/strict';
import * as http from 'node:http';
import * as path from 'node:path';
import { test } from 'node:test';
import { QelosMiddleware } from '../src/middleware';
import { getQelosMock } from '../src/mock';
import { normalizeModuleOptions } from '../src/module-options';
import { QelosProxyMiddleware } from '../src/proxy.middleware';
import { createRequestSdk } from '../src/sdk-factory';
import type { AnyRequest } from '../src/types';

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

function listen(options: ReturnType<typeof normalizeModuleOptions>): Promise<{ server: http.Server; base: string }> {
  const proxy = new QelosProxyMiddleware(options);
  const middleware = new QelosMiddleware(options);
  const server = http.createServer((req, res) => {
    const fail = (e: unknown) => {
      res.statusCode = 500;
      res.end(String(e));
    };
    if (req.url?.startsWith('/api/')) {
      proxy.use(req, res, fail);
      return;
    }
    middleware
      .use(req, res, async (err) => {
        if (err) return fail(err);
        const ctx = (req as unknown as AnyRequest).qelos!;
        const u: any = await ctx.sdk.authentication.getLoggedInUser().catch(() => null);
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ctx: ctx.user?.email ?? null, sdk: u?.email ?? null }));
      })
      .catch(fail);
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ server, base: `http://127.0.0.1:${addr.port}` });
    }),
  );
}

test('mock mode serves /api/** from the mock without upstream', async () => {
  const options = normalizeModuleOptions(mockConfig());
  const { server, base } = await listen(options);
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

    const state = (await getQelosMock(options.config).get())!.state;
    assert.ok(state.entities.list('product').length >= 2);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('createRequestSdk uses the mock when active', async () => {
  const sdk = createRequestSdk({ config: mockConfig(), request: { headers: {} } });
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
  const { server, base } = await listen(normalizeModuleOptions({ appUrl: '' }));
  try {
    const res = await fetch(`${base}/api/me`);
    assert.equal(res.status, 503);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
