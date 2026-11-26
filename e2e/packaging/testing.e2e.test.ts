import { after, before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFile, execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

/**
 * End-to-end: pack @qelos/testing (with the SDK it works with) exactly as it would be published, unpack it into an
 * empty project (no workspace links) and use it from plain Node: every entry point, the mock SDK, the HTTP test
 * client, the `qelos-testing` command (serve and record) and TypeScript consumers.
 * Requires the packages to be built (CI builds packages first).
 */
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const execFileAsync = promisify(execFile);
const work = mkdtempSync(join(tmpdir(), 'qelos-testing-e2e-'));
const project = join(work, 'consumer');
const installed = join(project, 'node_modules', '@qelos', 'testing');
const manifest = () => JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));

before(() => {
  mkdirSync(join(project, 'node_modules', '@qelos'), { recursive: true });
  writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
  for (const [name, dir] of [['sdk', 'packages/sdk'], ['global-types', 'packages/global-types'], ['testing', 'packages/testing']]) {
    const destination = join(project, 'node_modules', '@qelos', name);
    const pack = join(work, 'packs', name);
    mkdirSync(destination);
    mkdirSync(pack, { recursive: true });
    execFileSync('pnpm', ['pack', '--pack-destination', pack], { cwd: join(repo, dir), stdio: 'pipe' });
    execFileSync('tar', ['xzf', join(pack, readdirSync(pack)[0]), '-C', destination, '--strip-components=1']);
  }
});

after(() => rmSync(work, { recursive: true, force: true }));

const run = async (file: string, code: string) => {
  writeFileSync(join(project, file), code);
  const { stdout } = await execFileAsync(process.execPath, ['--no-warnings', file], { cwd: project, timeout: 60_000 });
  return stdout.trim().split('\n').pop()!;
};

const ENTRY_POINTS = ['@qelos/testing', '@qelos/testing/sdk', '@qelos/testing/fixtures', '@qelos/testing/http', '@qelos/testing/cassette'];

describe('the published package', () => {
  test('exposes the documented entry points and the command, and has no workspace references', () => {
    const pkg = manifest();
    assert.deepEqual(Object.keys(pkg.exports).filter((k) => k !== './package.json').sort(), ['.', './cassette', './fixtures', './http', './sdk']);
    assert.equal(JSON.stringify(pkg).includes('workspace:'), false);
    const bin = join(installed, pkg.bin['qelos-testing']);
    assert.match(readFileSync(bin, 'utf8'), /^#!\/usr\/bin\/env node/);
    for (const target of Object.values<any>(pkg.exports)) {
      if (typeof target === 'string') continue;
      for (const file of [target.default, target.import.default, target.import.types, target.require.default, target.require.types]) {
        assert.ok(existsSync(join(installed, file)), file);
      }
      assert.match(target.require.default, /^\.\/dist\/cjs\//, 'require() gets the CommonJS build');
    }
    assert.equal(existsSync(join(installed, 'test')), false, 'tests are not published');
  });

  for (const entry of ENTRY_POINTS) {
    test(`${entry} loads with import and require`, async () => {
      assert.equal(await run('load.mjs', `const m = await import('${entry}'); console.log(Object.keys(m).length > 0)`), 'true');
      assert.equal(await run('load.cjs', `console.log(Object.keys(require('${entry}')).length > 0)`), 'true');
    });
  }
});

describe('using it from a clean project', () => {
  test('createMockSdk with fixtures, faults and scripted AI', async () => {
    const out = await run(
      'sdk.mjs',
      `import { createMockSdk } from '@qelos/testing/sdk';
import { admin, blueprint, entities } from '@qelos/testing/fixtures';
const boss = admin({ password: 'pw' });
const { sdk, mock } = createMockSdk({ persona: boss.email, seed: { personas: [boss], blueprints: [blueprint('todo')], entities: { todo: entities(2, { title: 't{n}' }) } } });
const me = await sdk.authentication.getLoggedInUser();
const list = await sdk.entities('todo').getList();
mock.ai.reply('hi', 'hello from the mock');
const chat = await createMockSdk({ sdkOptions: { apiToken: 'x' } }).mock.fetch('/api/ai/a/chat-completion', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'yo' }] }) }).then((r) => r.json());
mock.faults.fail('/api/me', 503);
const failed = await sdk.authentication.getLoggedInUser().then(() => 'ok', () => 'failed');
console.log(JSON.stringify({ me: me.email === boss.email, titles: list.map((e) => e.metadata?.title ?? e.title), chat: chat.choices[0].message.content, failed }));
`,
    );
    assert.deepEqual(JSON.parse(out), { me: true, titles: ['t1', 't2'], chat: 'Mock response: yo', failed: 'failed' });
  });

  test('testApp serves an app and keeps the session', async () => {
    const out = await run(
      'http.mjs',
      `import { testApp } from '@qelos/testing/http';
const client = await testApp((req, res) => { if (req.url === '/login') res.setHeader('set-cookie', 's=1; Path=/'); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ cookie: req.headers.cookie ?? null })); });
await client.fetch('/login');
const { body } = await client.json('/me');
await client.close();
console.log(JSON.stringify(body));
`,
    );
    assert.deepEqual(JSON.parse(out), { cookie: 's=1' });
  });

  /** Run the installed `qelos-testing` command until its ready line, hand over the origin, then stop it. */
  async function withCommand<T>(args: string[], ready: RegExp, use: (origin: string) => Promise<T>): Promise<T> {
    const bin = join(installed, manifest().bin['qelos-testing']);
    const child = spawn(process.execPath, [bin, ...args], { cwd: project, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    try {
      const origin = await new Promise<string>((done, fail) => {
        const timer = setTimeout(() => fail(new Error(`not ready: ${output}`)), 20_000);
        const read = (chunk: Buffer) => {
          output += chunk;
          const match = output.match(ready);
          if (match) {
            clearTimeout(timer);
            done(match[1]);
          }
        };
        child.stdout!.on('data', read);
        child.stderr!.on('data', read);
        child.on('exit', (code) => fail(new Error(`exited with ${code}: ${output}`)));
      });
      return await use(origin);
    } finally {
      child.kill('SIGKILL');
    }
  }

  test('qelos-testing serve runs a mock server', async () => {
    await withCommand(['serve', '--port', '0'], /QELOS_MOCK_READY (\S+)/, async (origin) => {
      const res = await fetch(`${origin}/api/blueprints`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(await res.json()));
    });
  });

  test('qelos-testing record captures a redacted cassette that createMockQelos replays', async () => {
    const upstream = createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ plans: ['pro'], apiToken: 'real-secret-value' }));
      });
    });
    await new Promise<void>((r) => upstream.listen(0, '127.0.0.1', () => r()));
    const target = `http://127.0.0.1:${(upstream.address() as { port: number }).port}`;
    try {
      await withCommand(['record', '--target', target, '--out', './fixtures', '--port', '0'], /record ready at (\S+)/, async (origin) => {
        assert.equal((await fetch(`${origin}/api/custom-plans`)).status, 200);
      });
    } finally {
      upstream.closeAllConnections?.();
      await new Promise<void>((r) => upstream.close(() => r()));
    }
    const cassette = readFileSync(join(project, 'fixtures', 'cassette.jsonl'), 'utf8');
    assert.equal(cassette.includes('real-secret-value'), false);
    const replayed = await run(
      'replay.mjs',
      `import { createMockQelos } from '@qelos/testing';
const mock = createMockQelos({ logger: () => {}, cassette: './fixtures' });
console.log(JSON.stringify(await (await mock.fetch('/api/custom-plans')).json()));
`,
    );
    assert.deepEqual(JSON.parse(replayed), { plans: ['pro'], apiToken: '[REDACTED]' });
  });
});

describe('under Jest in its default (CommonJS) mode', () => {
  const jest = createRequire(join(repo, 'package.json')).resolve('jest/bin/jest');

  test('the entry points load with require() and the mock works, with no transform or experimental flags', async () => {
    const dir = join(project, 'jest-project');
    mkdirSync(dir);
    // its own package.json: a plain CommonJS project, as `jest` sets one up by default
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'jest-project', private: true }));
    writeFileSync(
      join(dir, 'mock.test.js'),
      `const { createMockQelos } = require('@qelos/testing');
const { createMockSdk } = require('@qelos/testing/sdk');
const { admin, blueprint, entities } = require('@qelos/testing/fixtures');
const { testApp } = require('@qelos/testing/http');
const { createRecorder, loadCassette } = require('@qelos/testing/cassette');

test('mock SDK with fixtures, faults and scripted AI', async () => {
  const boss = admin({ password: 'pw' });
  const { sdk, mock } = createMockSdk({ persona: boss.email, seed: { personas: [boss], blueprints: [blueprint('todo')], entities: { todo: entities(2, { title: 't{n}' }) } } });
  expect((await sdk.authentication.getLoggedInUser()).email).toBe(boss.email);
  expect(await sdk.entities('todo').getList()).toHaveLength(2);
  mock.faults.fail('/api/me', 503);
  await expect(sdk.authentication.getLoggedInUser()).rejects.toThrow();
});

test('testApp and the server', async () => {
  const mock = createMockQelos({ logger: () => {} });
  const client = await testApp((req, res) => res.end(JSON.stringify({ ok: true })));
  expect((await client.json('/')).body).toEqual({ ok: true });
  await client.close();
  expect((await mock.fetch('/api/blueprints')).status).toBe(200);
  expect(typeof createRecorder).toBe('function');
  expect(typeof loadCassette).toBe('function');
});
`,
    );
    const { stderr } = await execFileAsync(process.execPath, [jest, '--rootDir', dir, '--ci', '--testEnvironment', 'node'], { cwd: dir, timeout: 90_000 });
    assert.match(stderr, /Tests:\s+2 passed, 2 total/);
  });
});

describe('TypeScript consumers', () => {
  const ts = createRequire(join(repo, 'packages', 'testing', 'package.json'))('typescript') as typeof import('typescript');
  const source = `import { createMockQelos } from '@qelos/testing';
import { createMockSdk } from '@qelos/testing/sdk';
import { persona } from '@qelos/testing/fixtures';
import { testApp } from '@qelos/testing/http';
import { createRecorder } from '@qelos/testing/cassette';
const { sdk } = createMockSdk({ seed: { personas: [persona()] } });
export const used = [createMockQelos, sdk.authentication, testApp, createRecorder];
`;
  const modes: Array<[string, import('typescript').CompilerOptions]> = [
    ['node16', { module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16 }],
    ['nodenext', { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext }],
    ['bundler', { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler }],
    ['node10 (moduleResolution: node)', { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.NodeJs }],
  ];
  test('a CommonJS file gets the CommonJS declarations under node16', () => {
    writeFileSync(join(project, 'consumer.cts'), source);
    const program = ts.createProgram([join(project, 'consumer.cts')], {
      module: ts.ModuleKind.Node16,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      types: [],
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
      target: ts.ScriptTarget.ES2022,
    });
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);
    assert.ok(program.getSourceFiles().some((f) => /testing\/dist\/cjs\/sdk\/index\.d\.ts$/.test(f.fileName)));
  });

  for (const [label, options] of modes) {
    test(`type-checks under ${label}`, () => {
      writeFileSync(join(project, 'consumer.ts'), source);
      const program = ts.createProgram([join(project, 'consumer.ts')], {
        ...options,
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        types: [],
        lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
        target: ts.ScriptTarget.ES2022,
      });
      const errors = ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      assert.deepEqual(errors, []);
    });
  }
});
