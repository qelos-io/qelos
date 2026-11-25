import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import * as http from 'node:http';
import { test } from 'node:test';
import type express from 'express';
import { createQelosIntegrator } from '../src/index';
import { createRequestSdk } from '../src/sdk-factory';

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

function listen(app: express.Application): Promise<{ server: http.Server; base: string }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) resolve({ server, base: `http://127.0.0.1:${addr.port}` });
      else reject(new Error('no port'));
    });
  });
}

export function registerMockTests(expressModule: typeof express, label: string): void {
  test(`[${label}] mock mode serves /api/** from the mock without upstream`, async () => {
    const config = mockConfig();
    const { middleware, proxy, mock } = createQelosIntegrator({ config });
    assert.equal(mock.active, true);

    const app = expressModule();
    app.use(middleware);
    app.get('/whoami', (req, res) => {
      req.qelos.sdk.authentication
        .getLoggedInUser()
        .then((u: any) => res.json({ ctx: req.qelos.user?.email, sdk: u?.email }))
        .catch((e: Error) => res.status(500).json({ error: e.message }));
    });
    app.use('/api', proxy!);

    const { server, base } = await listen(app);
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

      const state = (await mock.get())!.state;
      assert.ok(state.entities.list('product').length >= 2);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test(`[${label}] createRequestSdk uses the mock when active`, async () => {
    const config = mockConfig();
    createQelosIntegrator({ config });
    const sdk = createRequestSdk({ config, req: { headers: {} } as any });
    const list: any = await sdk.entities('product').getList();
    assert.ok(list.length >= 2);
  });

  test(`[${label}] mock is ignored in production unless allowInProduction`, async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const warn = console.warn;
    console.warn = () => {};
    try {
      const { mock } = createQelosIntegrator({ config: mockConfig() });
      assert.equal(mock.active, false);
      assert.equal(await mock.get(), null);
      const forced = createQelosIntegrator({
        config: { appUrl: 'http://x.invalid', mock: { ...mockConfig().mock, allowInProduction: true } },
      });
      assert.equal(forced.mock.active, true);
    } finally {
      console.warn = warn;
      if (prev === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev;
    }
  });

  test(`[${label}] logs a banner when mock mode is active`, () => {
    const warn = console.warn;
    const lines: string[] = [];
    console.warn = (...a: unknown[]) => void lines.push(a.join(' '));
    try {
      createQelosIntegrator({ config: mockConfig() });
    } finally {
      console.warn = warn;
    }
    assert.ok(lines.some((l) => l.includes('QELOS MOCK MODE IS ACTIVE')));
  });

  test(`[${label}] structurally equal mock options share one mock`, async () => {
    const mock = { artifactsDir: FIXTURE, logger: () => {} };
    const a = createQelosIntegrator({ config: { appUrl: 'http://x.invalid', mock } });
    const b = createQelosIntegrator({ config: { appUrl: 'http://x.invalid', mock: { ...mock } } });
    assert.equal(await a.mock.get(), await b.mock.get());
  });

  test(`[${label}] without mock config the proxy still reports not configured`, async () => {
    const { proxy, mock } = createQelosIntegrator({ config: { appUrl: '' } });
    assert.equal(mock.active, false);
    const app = expressModule();
    app.use('/api', proxy!);
    const { server, base } = await listen(app);
    try {
      const res = await fetch(`${base}/api/me`);
      assert.equal(res.status, 503);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
}
