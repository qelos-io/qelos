import { after, before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

/**
 * What an app developer does: a Jest project in its default (CommonJS) mode tests a server that uses a packed Qelos
 * integrator in mock mode, with `testApp()` from the packed @qelos/testing. No transforms, no experimental flags.
 * Frameworks and Jest come from the repo's install. Requires the packages and integrators to be built.
 */
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const execFileAsync = promisify(execFile);
const work = mkdtempSync(join(tmpdir(), 'qelos-integrators-jest-e2e-'));
const project = join(work, 'consumer');

const servers: Record<string, { dependencies: string[]; app: string }> = {
  express: {
    dependencies: ['express'],
    app: `const express = require('express');
  const { createQelosIntegrator } = require('@qelos/integrator-express');
  const { middleware, proxy } = createQelosIntegrator({ config });
  const app = express();
  app.use(middleware);
  app.get('/whoami', (req, res) => res.json({ email: req.qelos.user?.email ?? null }));
  app.use('/api', proxy);
  return { target: app, stop: async () => {} };`,
  },
  fastify: {
    dependencies: ['fastify', 'fastify-plugin'],
    app: `const app = require('fastify')();
  await app.register(require('@qelos/integrator-fastify'), { config });
  app.get('/whoami', async (request) => ({ email: request.qelos.user?.email ?? null }));
  await app.ready();
  return { target: app.server, stop: () => app.close() };`,
  },
  nest: {
    dependencies: ['@nestjs/common', '@nestjs/core', '@nestjs/platform-express', 'reflect-metadata', 'rxjs'],
    app: `require('reflect-metadata');
  const { Controller, Get, Module, Req } = require('@nestjs/common');
  const { NestFactory } = require('@nestjs/core');
  const { QelosModule } = require('@qelos/integrator-nest');
  class WhoAmI { whoami(request) { return { email: request.qelos?.user?.email ?? null }; } }
  Get('whoami')(WhoAmI.prototype, 'whoami', Object.getOwnPropertyDescriptor(WhoAmI.prototype, 'whoami'));
  Req()(WhoAmI.prototype, 'whoami', 0);
  Controller()(WhoAmI);
  class AppModule {}
  Module({ imports: [QelosModule.forRoot({ config })], controllers: [WhoAmI] })(AppModule);
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  return { target: app.getHttpServer(), stop: () => app.close() };`,
  },
};

before(() => {
  mkdirSync(join(project, 'node_modules', '@qelos'), { recursive: true });
  writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true }));
  const packages = [
    ['sdk', 'packages/sdk'],
    ['global-types', 'packages/global-types'],
    ['testing', 'packages/testing'],
    ...Object.keys(servers).map((name) => [`integrator-${name}`, `integrators/${name}`]),
  ];
  for (const [name, dir] of packages) {
    const destination = join(project, 'node_modules', '@qelos', name);
    const pack = join(work, 'packs', name);
    mkdirSync(destination);
    mkdirSync(pack, { recursive: true });
    execFileSync('pnpm', ['pack', '--pack-destination', pack], { cwd: join(repo, dir), stdio: 'pipe' });
    execFileSync('tar', ['xzf', join(pack, readdirSync(pack)[0]), '-C', destination, '--strip-components=1']);
  }
  for (const [name, { dependencies }] of Object.entries(servers)) {
    for (const dependency of dependencies) {
      const link = join(project, 'node_modules', dependency);
      if (existsSync(link)) continue;
      const source = [join(repo, 'integrators', name, 'node_modules', dependency), join(repo, 'node_modules', dependency)].find(existsSync);
      assert.ok(source, `${dependency} is not installed in the repo`);
      mkdirSync(dirname(link), { recursive: true });
      symlinkSync(realpathSync(source!), link, 'dir');
    }
  }
  for (const [name, { app }] of Object.entries(servers)) {
    writeFileSync(
      join(project, `${name}.test.js`),
      `const { testApp } = require('@qelos/testing/http');

const config = {
  appUrl: 'http://unreachable.invalid',
  mock: { logger: () => {}, seed: { personas: [{ email: 'dev@example.com', password: 'secret-pass-1' }] } },
};

async function start() {
  ${app}
}

test('${name}: the proxy and the app routes know the persona', async () => {
  const server = await start();
  const client = await testApp(server.target);
  try {
    expect((await client.json('/whoami')).body).toEqual({ email: null });
    const dev = client.as('dev@example.com');
    expect((await dev.json('/api/me')).body.email).toBe('dev@example.com');
    expect((await dev.json('/whoami')).body).toEqual({ email: 'dev@example.com' });
  } finally {
    await client.close();
    await server.stop();
  }
});
`,
    );
  }
});

after(() => rmSync(work, { recursive: true, force: true }));

describe('integrators in mock mode under Jest (default CommonJS mode)', () => {
  const jest = createRequire(join(repo, 'package.json')).resolve('jest/bin/jest');
  for (const name of Object.keys(servers)) {
    test(`${name}`, async () => {
      const { stderr } = await execFileAsync(
        process.execPath,
        [jest, '--rootDir', project, '--ci', '--testEnvironment', 'node', `${name}.test.js`],
        { cwd: project, timeout: 90_000 },
      );
      assert.match(stderr, /Tests:\s+1 passed, 1 total/);
    });
  }
});
