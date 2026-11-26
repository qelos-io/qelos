import { after, before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFile, execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer as createNetServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

/**
 * End-to-end for the ES module integrators (Next.js and Nuxt): pack them as they would be published, unpack them
 * into an empty project (no workspace links), then
 *  - load every public subpath from plain Node with `import` and `require`;
 *  - build a real Next.js app and real Nuxt 3 and Nuxt 4 apps with the integrator, serve them, and sign in through
 *    them against a fake Qelos tenant.
 * Frameworks come from the repo's install, so nothing is downloaded. Requires the packages to be built.
 */
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const execFileAsync = promisify(execFile);

/** Pack the integrator and the Qelos packages it needs into `<project>/node_modules`, and link third-party ones. */
function createProject(integrator: 'next' | 'nuxt', thirdParty: string[], extraSources: string[] = []) {
  const work = mkdtempSync(join(tmpdir(), `qelos-integrator-${integrator}-e2e-`));
  const project = join(work, 'consumer');
  mkdirSync(join(project, 'node_modules', '@qelos'), { recursive: true });
  writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true }));
  for (const [name, dir] of [['sdk', 'packages/sdk'], ['global-types', 'packages/global-types'], [`integrator-${integrator}`, `integrators/${integrator}`]]) {
    const destination = join(project, 'node_modules', '@qelos', name);
    const pack = join(work, 'packs', name);
    mkdirSync(destination);
    mkdirSync(pack, { recursive: true });
    execFileSync('pnpm', ['pack', '--pack-destination', pack], { cwd: join(repo, dir), stdio: 'pipe' });
    execFileSync('tar', ['xzf', join(pack, readdirSync(pack)[0]), '-C', destination, '--strip-components=1']);
  }
  for (const dependency of thirdParty) {
    const source = [
      ...extraSources.map((dir) => join(dir, 'node_modules', dependency)),
      join(repo, 'integrators', integrator, 'node_modules', dependency),
      join(repo, 'node_modules', dependency),
      join(repo, 'node_modules', '.pnpm', 'node_modules', dependency),
    ].find(existsSync);
    assert.ok(source, `${dependency} is not installed in the repo`);
    const link = join(project, 'node_modules', dependency);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(realpathSync(source!), link, 'dir');
  }
  return { work, project };
}

const publicSubpaths = (integrator: string) =>
  Object.keys(JSON.parse(readFileSync(join(repo, 'integrators', integrator, 'package.json'), 'utf8')).exports).filter(
    (key) => !key.includes('*') && key !== './package.json',
  );

const freePort = () =>
  new Promise<number>((done) => {
    const server = createNetServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => done(port));
    });
  });

/** A fake Qelos tenant: signing in sets a session cookie, and /api/me knows the user behind it. */
async function fakeTenant() {
  const log: string[] = [];
  const server: Server = createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      const path = req.url!.split('?')[0];
      log.push(`${req.method} ${path}`);
      res.setHeader('content-type', 'application/json');
      if (path === '/api/signin') {
        res.setHeader('set-cookie', 'qlt=session-1; Path=/; HttpOnly');
        return res.end(JSON.stringify({ payload: { user: { email: 'dev@example.com' } } }));
      }
      if (path === '/api/me' && req.headers.cookie?.includes('qlt=session-1')) {
        return res.end(JSON.stringify({ _id: 'u1', email: 'dev@example.com', roles: ['user'] }));
      }
      res.statusCode = path === '/api/me' ? 401 : 404;
      res.end('{}');
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  return {
    log,
    url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    close: () => {
      server.closeAllConnections?.();
      return new Promise<void>((r) => server.close(() => r()));
    },
  };
}

/** Start a built app directly with node (no shell, so killing the process stops it) and wait until it answers. */
async function serve(args: string[], cwd: string, env: NodeJS.ProcessEnv, base: string) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'ignore' });
  for (let i = 0; ; i++) {
    try {
      await fetch(base);
      return child;
    } catch (e) {
      if (i > 200) {
        child.kill('SIGKILL');
        throw e;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

for (const [integrator, thirdParty] of [
  ['next', ['next', 'react']],
  ['nuxt', ['@nuxt/kit', 'h3', 'ufo']],
] as const) {
  describe(`the packed @qelos/integrator-${integrator} loads from plain Node`, () => {
    let work = '';
    let project = '';
    before(() => ({ work, project } = createProject(integrator, [...thirdParty])));
    after(() => rmSync(work, { recursive: true, force: true }));

    for (const subpath of publicSubpaths(integrator)) {
      const specifier = `@qelos/integrator-${integrator}${subpath.slice(1)}`;
      test(`${specifier}: import and require`, async () => {
        const node = (...args: string[]) => execFileAsync(process.execPath, ['--no-warnings', ...args], { cwd: project, timeout: 30_000 });
        await assert.doesNotReject(node('--input-type=module', '-e', `await import('${specifier}'); process.exit(0)`));
        await assert.doesNotReject(node('-e', `require('${specifier}'); process.exit(0)`));
      });
    }
  });
}

describe('a real Next.js app built with the packed integrator', () => {
  let work = '';
  let project = '';
  let tenant: Awaited<ReturnType<typeof fakeTenant>>;
  let app: ChildProcess | undefined;
  let base = '';

  const write = (file: string, content: string) => {
    mkdirSync(dirname(join(project, file)), { recursive: true });
    writeFileSync(join(project, file), content);
  };

  before(async () => {
    tenant = await fakeTenant();
    const appUrl = tenant.url;

    ({ work, project } = createProject('next', ['next', 'react']));
    const reactDom = readdirSync(join(repo, 'node_modules', '.pnpm')).find((d) => /^react-dom@18\./.test(d));
    assert.ok(reactDom, 'react-dom is not installed in the repo');
    symlinkSync(join(repo, 'node_modules', '.pnpm', reactDom!, 'node_modules', 'react-dom'), join(project, 'node_modules', 'react-dom'), 'dir');

    write('middleware.js', `export { qelosMiddleware as middleware } from '@qelos/integrator-next/middleware';
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
`);
    write('app/api/[...qelos]/route.js', `import { createQelosApiProxyHandlers } from '@qelos/integrator-next/runtime/api-proxy';
const handlers = createQelosApiProxyHandlers({ appUrl: process.env.QELOS_APP_URL });
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = handlers;
`);
    write('app/layout.js', `export default function Layout({ children }) { return <html><body>{children}</body></html>; }
`);
    write('app/page.js', `import { getQelosContext } from '@qelos/integrator-next/context';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const { user } = await getQelosContext();
  return <p id="who">{user ? user.email : 'anonymous'}</p>;
}
`);

    const env = { ...process.env, NODE_ENV: 'production' as const, NEXT_TELEMETRY_DISABLED: '1', QELOS_APP_URL: appUrl };
    const next = join(project, 'node_modules', 'next', 'dist', 'bin', 'next');
    await execFileAsync(process.execPath, [next, 'build'], { cwd: project, env, timeout: 240_000, maxBuffer: 10 * 1024 * 1024 });

    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    app = await serve([next, 'start', '-p', String(port), '-H', '127.0.0.1'], project, env, base);
  });

  after(async () => {
    app?.kill('SIGKILL');
    await tenant?.close();
    rmSync(work, { recursive: true, force: true });
  });

  const who = async (cookie?: string) => {
    const res = await fetch(base, { headers: cookie ? { cookie } : {} });
    assert.equal(res.status, 200);
    return (await res.text()).match(/<p id="who">([^<]*)<\/p>/)?.[1];
  };

  test('a page renders anonymously without a session', async () => {
    assert.equal(await who(), 'anonymous');
  });

  test('signing in through the proxy route reaches the tenant and sets the session cookie', async () => {
    const res = await fetch(`${base}/api/signin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(res.status, 200);
    assert.ok(res.headers.getSetCookie().some((c) => c.startsWith('qlt=session-1')));
    assert.ok(tenant.log.includes('POST /api/signin'));
  });

  test('with the session cookie, the page and the proxy know the user', async () => {
    assert.equal(await who('qlt=session-1'), 'dev@example.com');
    const me = await fetch(`${base}/api/me`, { headers: { cookie: 'qlt=session-1' } });
    assert.equal(((await me.json()) as { email: string }).email, 'dev@example.com');
  });
});

for (const major of [3, 4] as const) {
  describe(`a real Nuxt ${major} app built with the packed integrator`, () => {
    let work = '';
    let project = '';
    let tenant: Awaited<ReturnType<typeof fakeTenant>>;
    let app: ChildProcess | undefined;
    let base = '';

    before(async () => {
      tenant = await fakeTenant();
      const fixture = join(repo, 'integrators', 'nuxt', 'test', 'fixtures', `nuxt${major}`);
      // `vue` is what a real install of nuxt also puts at the top level (the server renderer is traced from there);
      // take the copy this Nuxt version depends on
      const nuxtDependencies = dirname(dirname(realpathSync(join(fixture, 'node_modules', 'nuxt'))));
      ({ work, project } = createProject('nuxt', ['nuxt', 'vue', '@nuxt/kit', 'h3', 'ufo'], [fixture, nuxtDependencies]));
      writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
      writeFileSync(join(project, 'nuxt.config.ts'), `export default defineNuxtConfig({
  modules: ['@qelos/integrator-nuxt'],
  qelos: { appUrl: ${JSON.stringify(tenant.url)} },
  telemetry: false,
});
`);
      // `useQelos` is not imported: the module has to register its composables for auto-import
      writeFileSync(join(project, 'app.vue'), `<script setup>
const { user, isAuthenticated } = useQelos();
</script>

<template>
  <p id="who">{{ isAuthenticated ? user.email : 'anonymous' }}</p>
</template>
`);
      mkdirSync(join(project, 'server', 'routes'), { recursive: true });
      writeFileSync(join(project, 'server', 'routes', 'whoami.get.js'), `export default defineEventHandler((event) => ({ email: event.context.qelos?.user?.email ?? null }));
`);

      const env = { ...process.env, NODE_ENV: 'production' as const, NUXT_TELEMETRY_DISABLED: '1' };
      await execFileAsync(process.execPath, [join(project, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs'), 'build'], {
        cwd: project,
        env,
        timeout: 240_000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const port = await freePort();
      base = `http://127.0.0.1:${port}`;
      app = await serve([join(project, '.output', 'server', 'index.mjs')], project, { ...env, PORT: String(port), HOST: '127.0.0.1' }, base);
    });

    after(async () => {
      app?.kill('SIGKILL');
      await tenant?.close();
      rmSync(work, { recursive: true, force: true });
    });

    const who = async (cookie?: string) => ((await (await fetch(`${base}/whoami`, { headers: cookie ? { cookie } : {} })).json()) as { email: string | null }).email;

    test('a server route sees no user without a session', async () => {
      assert.equal(await who(), null);
    });

    test('a page renders the identity from the useQelos() composable on the server', async () => {
      const page = async (cookie?: string) => {
        const res = await fetch(base, { headers: cookie ? { cookie } : {} });
        assert.equal(res.status, 200);
        return (await res.text()).match(/<p id="who">([^<]*)<\/p>/)?.[1];
      };
      assert.equal(await page(), 'anonymous');
      assert.equal(await page('qlt=session-1'), 'dev@example.com');
    });

    test('signing in through the proxy reaches the tenant and sets the session cookie', async () => {
      const res = await fetch(`${base}/api/signin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      assert.equal(res.status, 200);
      assert.ok(res.headers.getSetCookie().some((c) => c.startsWith('qlt=session-1')));
      assert.ok(tenant.log.includes('POST /api/signin'));
    });

    test('with the session cookie, the server middleware and the proxy know the user', async () => {
      assert.equal(await who('qlt=session-1'), 'dev@example.com');
      const me = await fetch(`${base}/api/me`, { headers: { cookie: 'qlt=session-1' } });
      assert.equal(((await me.json()) as { email: string }).email, 'dev@example.com');
    });
  });
}
