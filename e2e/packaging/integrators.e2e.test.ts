import { after, before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

/**
 * End-to-end for the Node server integrators: pack each integrator and the Qelos packages it needs exactly as they
 * would be published, unpack them into an empty project (no workspace links), and run a server with mock mode on
 * from plain Node, loading the integrator once with `require` and once with `import`.
 * Frameworks (express, fastify, Nest, ...) are taken from the repo's install, so nothing is downloaded.
 * Requires the packages to be built (CI builds packages and integrators first).
 */
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const here = dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

const qelosPackages = [
  ['sdk', 'packages/sdk'],
  ['global-types', 'packages/global-types'],
  ['testing', 'packages/testing'],
] as const;

const frameworks = {
  express: ['express'],
  fastify: ['fastify', 'fastify-plugin'],
  nest: ['@nestjs/common', '@nestjs/core', '@nestjs/platform-express', 'reflect-metadata', 'rxjs'],
} as const;

for (const [framework, thirdParty] of Object.entries(frameworks)) {
  describe(`the packed @qelos/integrator-${framework} runs from a clean project on plain Node`, () => {
    const work = mkdtempSync(join(tmpdir(), `qelos-integrator-${framework}-e2e-`));
    const project = join(work, 'consumer');
    const integratorDir = join(repo, 'integrators', framework);

    before(() => {
      const packs = join(work, 'packs');
      mkdirSync(packs);
      mkdirSync(join(project, 'node_modules', '@qelos'), { recursive: true });
      writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true }));

      for (const [name, dir] of [...qelosPackages, [`integrator-${framework}`, `integrators/${framework}`] as const]) {
        const destination = join(project, 'node_modules', '@qelos', name);
        const pack = join(packs, name);
        mkdirSync(destination);
        mkdirSync(pack);
        execFileSync('pnpm', ['pack', '--pack-destination', pack], { cwd: join(repo, dir), stdio: 'pipe' });
        execFileSync('tar', ['xzf', join(pack, readdirSync(pack)[0]), '-C', destination, '--strip-components=1']);
      }

      for (const dependency of thirdParty) {
        const source = [join(integratorDir, 'node_modules', dependency), join(repo, 'node_modules', dependency)].find(existsSync);
        assert.ok(source, `${dependency} is not installed in the repo`);
        const link = join(project, 'node_modules', dependency);
        mkdirSync(dirname(link), { recursive: true });
        symlinkSync(realpathSync(source!), link, 'dir');
      }
      copyFileSync(join(here, 'fixtures', 'integrator-consumer.mjs'), join(project, 'consumer.mjs'));
    });

    after(() => rmSync(work, { recursive: true, force: true }));

    for (const build of ['cjs', 'esm'] as const) {
      test(`${build === 'cjs' ? 'require' : 'import'}: sign in, /api through the proxy, and the user on the app's own routes`, async () => {
        const { stdout } = await execFileAsync(process.execPath, ['--no-warnings', 'consumer.mjs'], {
          cwd: project,
          env: { ...process.env, FRAMEWORK: framework, BUILD: build, NODE_ENV: 'test' },
          encoding: 'utf8',
          timeout: 60_000,
        });
        assert.deepEqual(JSON.parse(stdout.trim().split('\n').pop()!), {
          anonymous: { email: null },
          signin: 200,
          me: 'dev@example.com',
          whoami: { email: 'dev@example.com' },
        });
      });
    }

    test('the published package ships its build output, and its manifest has no workspace references', () => {
      const installed = join(project, 'node_modules', '@qelos', `integrator-${framework}`);
      assert.ok(existsSync(join(installed, 'dist', 'index.js')));
      assert.ok(existsSync(join(installed, 'dist', 'index.d.ts')));
      assert.equal(readFileSync(join(installed, 'package.json'), 'utf8').includes('workspace:'), false);
    });
  });
}
