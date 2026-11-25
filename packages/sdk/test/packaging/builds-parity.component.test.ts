import { before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { packageRoot } from './helpers';

/**
 * Component test: the real SDK classes (BaseSDK + authentication + blueprint entities + administrator)
 * working together through a fake `fetch`, loaded from the compiled ES module build and from the compiled
 * CommonJS build. Both builds must send identical requests and parse identical responses.
 */
type Call = { method: string; path: string; headers: Record<string, string>; body: unknown };
type Build = { name: string; QelosSDK: any; QelosAdministratorSDK: any };

let builds: Build[] = [];

before(async () => {
  assert.ok(existsSync(join(packageRoot, 'dist', 'index.js')), 'dist is missing: run `pnpm -F @qelos/sdk build` before the tests');
  const require = createRequire(import.meta.url);
  const esm = await import(join(packageRoot, 'dist', 'index.js'));
  const esmAdmin = await import(join(packageRoot, 'dist', 'administrator', 'index.js'));
  builds = [
    { name: 'ES module build', QelosSDK: esm.default, QelosAdministratorSDK: esmAdmin.default },
    {
      name: 'CommonJS build',
      QelosSDK: require(join(packageRoot, 'dist', 'cjs', 'index.js')).default,
      QelosAdministratorSDK: require(join(packageRoot, 'dist', 'cjs', 'administrator', 'index.js')).default,
    },
  ];
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A tiny fake Qelos API that records every request. */
function fakeTenant() {
  const calls: Call[] = [];
  const fetchImpl = async (input: any, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const headers: Record<string, string> = {};
    new Headers(init.headers).forEach((v, k) => (headers[k] = v));
    const body = typeof init.body === 'string' && init.body ? JSON.parse(init.body) : undefined;
    const method = (init.method || 'GET').toUpperCase();
    calls.push({ method, path: url.pathname + url.search, headers, body });

    if (url.pathname === '/api/signin') return json({ payload: { token: 'access-1', refreshToken: 'refresh-1', user: { _id: 'u1', email: 'a@x.com' } } });
    if (url.pathname === '/api/me') return json({ _id: 'u1', email: 'a@x.com', roles: ['user'] });
    if (url.pathname === '/api/blueprints/todo/entities' && method === 'POST') return json({ _id: 'e1', identifier: 'e1', metadata: body });
    if (url.pathname === '/api/blueprints/todo/entities') return json([{ _id: 'e1', identifier: 'e1', metadata: { title: 'one' } }]);
    if (url.pathname === '/api/users') return json([{ _id: 'u1', email: 'a@x.com' }]);
    return json({ message: 'not found' }, 404);
  };
  return { calls, fetchImpl };
}

async function scenario(build: Build) {
  const { calls, fetchImpl } = fakeTenant();
  const sdk = new build.QelosSDK({ appUrl: 'https://tenant.example.com', fetch: fetchImpl });
  const results: Record<string, unknown> = {};

  results.signin = await sdk.authentication.oAuthSignin({ username: 'a@x.com', password: 'pw' });
  results.me = await sdk.authentication.getLoggedInUser();
  results.created = await sdk.entities('todo').create({ title: 'one' });
  results.list = await sdk.entities('todo').getList();

  const admin = new build.QelosAdministratorSDK({ appUrl: 'https://tenant.example.com', fetch: fetchImpl, accessToken: 'admin-token' });
  results.users = await admin.users.getList();
  return { calls, results };
}

describe('the ES module and CommonJS builds behave the same', () => {
  test('both builds expose the SDK classes', () => {
    assert.equal(builds.length, 2);
    for (const b of builds) {
      assert.equal(typeof b.QelosSDK, 'function', `${b.name}: QelosSDK`);
      assert.equal(typeof b.QelosAdministratorSDK, 'function', `${b.name}: QelosAdministratorSDK`);
    }
  });

  test('a sign-in, user, entity and administrator flow sends the same requests and returns the same data', async () => {
    const [esm, cjs] = await Promise.all(builds.map(scenario));
    assert.deepEqual(esm.calls, cjs.calls, 'requests differ between builds');
    assert.deepEqual(esm.results, cjs.results, 'results differ between builds');
  });

  for (const build of ['ES module build', 'CommonJS build']) {
    test(`${build}: the flow produces the expected requests`, async () => {
      const { calls, results } = await scenario(builds.find((b) => b.name === build)!);
      assert.deepEqual(
        calls.map((c) => `${c.method} ${c.path}`),
        [
          'POST /api/signin',
          'GET /api/me',
          'POST /api/blueprints/todo/entities?%24flat=true',
          'GET /api/blueprints/todo/entities?%24flat=true',
          'GET /api/users',
        ],
      );
      assert.deepEqual(calls[0].body, { username: 'a@x.com', password: 'pw', authType: 'oauth' });
      assert.equal(calls[1].headers.authorization, 'Bearer access-1', 'the token from sign-in is sent on the next call');
      assert.equal(calls[4].headers.authorization, 'Bearer admin-token');
      assert.equal((results.me as any).email, 'a@x.com');
      assert.equal((results.list as any[])[0].metadata.title, 'one');
    });
  }
});
