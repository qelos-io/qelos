import { after, before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * End-to-end: pack @qelos/plugin-play and the workspace packages it needs exactly as they would be published,
 * unpack them into an empty project's node_modules (no workspace links), and start a real plugin from plain Node
 * against a fake Qelos tenant, once with `require` and once with `import`.
 * Third-party dependencies (fastify, ...) are taken from the repo's install, so nothing is downloaded.
 * Requires the packages to be built (CI builds packages first).
 */
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pluginDir = join(repo, 'packages', 'plugin-play');
const consumerScript = join(pluginDir, 'test', 'packaging', 'fixtures', 'plugin-consumer.mjs');
const workspacePackages = ['plugin-play', 'sdk', 'global-types', 'cache-manager', 'web-sdk'];

const work = mkdtempSync(join(tmpdir(), 'qelos-plugin-play-e2e-'));
const project = join(work, 'demo-plugin');
const execFileAsync = promisify(execFile);

const sh = (cmd: string, args: string[], cwd: string) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();

async function freePort() {
  const { createServer } = await import('node:net');
  return new Promise<number>((res) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number };
      s.close(() => res(port));
    });
  });
}

before(() => {
  const packs = join(work, 'packs');
  mkdirSync(packs);
  mkdirSync(join(project, 'node_modules', '@qelos'), { recursive: true });
  writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'demo-plugin', description: 'demo', version: '1.0.0', private: true }));

  for (const name of workspacePackages) {
    const dest = join(project, 'node_modules', '@qelos', name);
    mkdirSync(dest, { recursive: true });
    sh('pnpm', ['pack', '--pack-destination', packs], join(repo, 'packages', name));
  }
  for (const tarball of readdirSync(packs)) {
    const name = tarball.replace(/^qelos-/, '').replace(/-\d+\.\d+\.\d+.*\.tgz$/, '');
    sh('tar', ['xzf', join(packs, tarball), '-C', join(project, 'node_modules', '@qelos', name), '--strip-components=1'], work);
  }

  // third-party dependencies come from the repo's install
  const fromPlugin = createRequire(join(pluginDir, 'package.json'));
  const deps = Object.keys(JSON.parse(execFileSync('node', ['-p', 'JSON.stringify(require("./package.json").dependencies)'], { cwd: pluginDir, encoding: 'utf8' }))).filter((d) => !d.startsWith('@qelos/'));
  for (const dep of deps) {
    const target = dirname(fromPlugin.resolve(`${dep}/package.json`));
    const link = join(project, 'node_modules', dep);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(target, link, 'dir');
  }
  // the SDK's own third-party needs (if any) resolve from the repo too
  copyFileSync(consumerScript, join(project, 'plugin-consumer.mjs'));
});

after(() => rmSync(work, { recursive: true, force: true }));

describe('the packed @qelos/plugin-play runs from a clean project on plain Node', () => {
  for (const build of ['cjs', 'esm'] as const) {
    test(`${build === 'cjs' ? 'require' : 'import'}: a plugin starts, signs in to the tenant and serves its endpoints`, async () => {
      const ports = [await freePort(), await freePort()];
      const { stdout } = await execFileAsync(process.execPath, ['--no-warnings', 'plugin-consumer.mjs'], {
        cwd: project,
        env: { ...process.env, PLUGIN_ENTRY: '@qelos/plugin-play', BUILD: build, PORT: String(ports[0]), INTERNAL_PORT: String(ports[1]) },
        encoding: 'utf8',
        timeout: 60_000,
      });
      const out = JSON.parse(stdout.trim().split('\n').pop()!);
      assert.ok(['start', 'addEndpoint', 'addInternalEndpoint', 'ResponseError'].every((k) => out.api.includes(k)));
      assert.deepEqual(out.tenantLog, ['POST /api/signin']);
      assert.deepEqual(out.hello, { status: 200, body: { hello: 'world' } });
      assert.equal(out.manifest.body.name, 'demo-plugin');
      assert.deepEqual(out.internal, { status: 200, body: { pong: true } });
    });
  }

  test('the published package contains the build output but not the tests or dependencies', () => {
    const files = readdirSync(join(project, 'node_modules', '@qelos', 'plugin-play'));
    assert.ok(files.includes('dist'));
    assert.ok(files.includes('package.json'));
    assert.equal(files.includes('test'), false);
    assert.equal(files.includes('node_modules'), false);
  });
});
