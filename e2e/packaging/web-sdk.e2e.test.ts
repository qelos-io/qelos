import { after, before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * End-to-end: pack @qelos/web-sdk exactly as it would be published, install the tarball into an empty project
 * (no workspace links, no registry), and run it inside a real DOM (happy-dom) against a real HTTP server,
 * once with `import` and once with `require`. Requires the package to be built (CI builds packages first).
 */
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkgDir = join(repo, 'packages', 'web-sdk');
const consumerScript = join(pkgDir, 'test', 'packaging', 'fixtures', 'dom-consumer.mjs');

const work = mkdtempSync(join(tmpdir(), 'qelos-web-sdk-e2e-'));
const project = join(work, 'consumer');
let server: Server;
let baseUrl = '';
const requests: Array<{ method: string; url: string; code?: string; body: any }> = [];

const sh = (cmd: string, args: string[], cwd: string) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
// the consumer talks to the HTTP server living in THIS process, so it must run asynchronously
const execFileAsync = promisify(execFile);
const consume = async (build: 'esm' | 'cjs') => {
  requests.length = 0;
  const { stdout } = await execFileAsync(process.execPath, ['--no-warnings', 'dom-consumer.mjs'], {
    cwd: project,
    env: { ...process.env, BUILD: build, FETCH: 'real', BASE_URL: baseUrl },
    encoding: 'utf8',
    timeout: 60_000,
  });
  return JSON.parse(stdout.trim().split('\n').pop()!);
};

before(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      requests.push({ method: req.method!, url: req.url!, code: req.headers.code as string | undefined, body: raw ? JSON.parse(raw) : undefined });
      res.setHeader('content-type', 'application/json');
      if (req.url === '/api/authorize') return res.end(JSON.stringify({ ok: true, echo: JSON.parse(raw).token }));
      if (req.url === '/api/un-authorize') return res.end('{"ok":true}');
      res.statusCode = 404;
      res.end('{}');
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;

  const packs = join(work, 'packs');
  mkdirSync(packs);
  sh('pnpm', ['pack', '--pack-destination', packs], pkgDir);
  mkdirSync(project);
  writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true }));
  sh('npm', ['install', '--offline', '--no-audit', '--no-fund', ...readdirSync(packs).map((f) => join(packs, f))], project);

  // the DOM implementation comes from the repo (nothing to download), the SDK from the packed tarball
  const happyDom = dirname(createRequire(join(pkgDir, 'package.json')).resolve('happy-dom/package.json'));
  symlinkSync(happyDom, join(project, 'node_modules', 'happy-dom'), 'dir');
  copyFileSync(consumerScript, join(project, 'dom-consumer.mjs'));
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise<void>((r) => server.close(() => r()));
  rmSync(work, { recursive: true, force: true });
});

describe('the packed @qelos/web-sdk works from a clean project', () => {
  for (const build of ['esm', 'cjs'] as const) {
    test(`${build === 'esm' ? 'import' : 'require'}: authorizes against a real HTTP server inside a DOM`, async () => {
      const out = await consume(build);
      assert.deepEqual(out.exports, ['QelosChatWidget', 'authorize', 'code', 'unAuthorize']);
      assert.equal(out.code, 'abc');
      assert.deepEqual(
        requests.map((r) => `${r.method} ${r.url}`),
        ['POST /api/authorize', 'POST /api/authorize', 'POST /api/un-authorize'],
      );
      assert.equal(requests[0].body.token, 'tok1');
      assert.equal(requests[1].body.token, 'tok2');
      assert.equal(requests[2].code, 'zzz');
      assert.equal(out.widgetMounted, 1);
      assert.equal(out.widgetAfterDestroy, 0);
    });
  }

  test('TypeScript consumers type-check under node10 and node16 resolution', () => {
    const ts = createRequire(join(pkgDir, 'package.json'))('typescript') as typeof import('typescript');
    const source = `import { authorize, unAuthorize, QelosChatWidget, code } from '@qelos/web-sdk';
import type { QelosChatWidgetOptions } from '@qelos/web-sdk';
const options: QelosChatWidgetOptions = { agentId: 'a', appUrl: 'http://x', apiToken: 't' };
export const widget = new QelosChatWidget(options);
export const run: [typeof authorize, typeof unAuthorize, string] = [authorize, unAuthorize, code];
`;
    const modes: Array<[string, string, import('typescript').CompilerOptions]> = [
      ['node10', 'a.ts', { module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.NodeJs }],
      ['node16 (ES module file)', 'b.mts', { module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16 }],
      ['node16 (CommonJS file)', 'c.cts', { module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16 }],
    ];
    for (const [label, file, options] of modes) {
      writeFileSync(join(project, file), source);
      const program = ts.createProgram([join(project, file)], { ...options, noEmit: true, strict: true, skipLibCheck: true, types: [], lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'], target: ts.ScriptTarget.ES2020 });
      const errors = ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      assert.deepEqual(errors, [], `${label}: ${errors.join(' | ')}`);
    }
  });
});
