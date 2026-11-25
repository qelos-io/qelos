import { before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { freePort, manifest, packageRoot, pluginProject, runPlugin } from './helpers';

/**
 * Component test: the real plugin runtime (Fastify app, manifest route, public and internal endpoints, startup
 * sign-in through the SDK) started in plain Node against a fake Qelos tenant over real HTTP.
 * Each module system gets its own process, because the runtime keeps module-level state.
 */
before(() => {
  assert.ok(existsSync(join(packageRoot, 'dist', 'index.js')), 'dist is missing: run `pnpm -F @qelos/plugin-play build` before the tests');
});

const EXPECTED_API = ['ResponseError', 'LifecycleEvent', 'addEndpoint', 'addInternalEndpoint', 'addProxyEndpoint', 'cacheManager', 'configure', 'getSdk', 'on', 'onCallback', 'onManifest', 'onNewTenant', 'onRefreshToken', 'onStoreUser', 'registerToHook', 'start'];

describe('a plugin started from the built package', () => {
  for (const build of ['cjs', 'esm'] as const) {
    describe(`loaded with ${build === 'cjs' ? 'require()' : 'import'}`, () => {
      let out: any;
      before(async () => {
        out = runPlugin({ cwd: pluginProject(), entry: join(packageRoot, manifest.main), build, ports: [await freePort(), await freePort()] });
      });

      test('exposes the public API', () => {
        for (const name of EXPECTED_API) assert.ok(out.api.includes(name), `missing export ${name}`);
      });

      test('signs in to the tenant on startup through the SDK', () => {
        assert.deepEqual(out.tenantLog, ['POST /api/signin']);
      });

      test('serves a public endpoint', () => {
        assert.deepEqual(out.hello, { status: 200, body: { hello: 'world' } });
      });

      test('serves the manifest built from the working directory package.json and the options', () => {
        assert.equal(out.manifest.status, 200);
        assert.equal(out.manifest.body.name, 'demo-plugin');
        assert.equal(out.manifest.body.description, 'demo');
        assert.match(out.manifest.body.proxyUrl, /\/api\/play$/);
      });

      test('serves an internal endpoint on its own port, and answers 404 for unknown routes', () => {
        assert.deepEqual(out.internal, { status: 200, body: { pong: true } });
        assert.equal(out.missing, 404);
      });
    });
  }
});
