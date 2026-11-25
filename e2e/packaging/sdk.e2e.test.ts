import { after, before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * End-to-end: pack @qelos/sdk exactly as it would be published, install the tarballs into an empty project
 * (no workspace links, no registry), and use it from plain Node with real `fetch` against a real HTTP server.
 * Requires the SDK to be built (CI builds packages before running tests).
 */
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sdkDir = join(repo, 'packages', 'sdk');
const globalTypesDir = join(repo, 'packages', 'global-types');

const work = mkdtempSync(join(tmpdir(), 'qelos-sdk-e2e-'));
const project = join(work, 'consumer');
let server: Server;
let baseUrl = '';
const requests: Array<{ method: string; url: string; auth?: string }> = [];

const sh = (cmd: string, args: string[], cwd: string) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
// consumers talk to the HTTP server living in THIS process, so they must run asynchronously (a sync exec would block it)
const execFileAsync = promisify(execFile);
const node = async (cwd: string, ...args: string[]) =>
  (await execFileAsync(process.execPath, ['--no-warnings', ...args], { cwd, encoding: 'utf8', timeout: 60_000 })).stdout.trim();

before(async () => {
  // 1. a real Qelos-shaped HTTP server
  server = createServer((req: IncomingMessage, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push({ method: req.method!, url: req.url!, auth: req.headers.authorization });
      res.setHeader('content-type', 'application/json');
      if (req.url === '/api/signin') return res.end(JSON.stringify({ payload: { token: 'tok-1', refreshToken: 'ref-1', user: { _id: 'u1', email: 'a@x.com' } } }));
      if (req.url === '/api/me') return res.end(JSON.stringify({ _id: 'u1', email: 'a@x.com' }));
      if (req.url!.startsWith('/api/blueprints/todo/entities')) return res.end(JSON.stringify([{ _id: 'e1', identifier: 'e1', metadata: { title: 'one' } }]));
      res.statusCode = 404;
      res.end('{"message":"not found"}');
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;

  // 2. pack what would be published and install the tarballs in an empty project
  const packs = join(work, 'packs');
  mkdirSync(packs);
  sh('pnpm', ['pack', '--pack-destination', packs], sdkDir);
  sh('pnpm', ['pack', '--pack-destination', packs], globalTypesDir);
  const tarballs = readdirSync(packs).map((f) => join(packs, f));
  mkdirSync(project);
  writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true }));
  sh('npm', ['install', '--offline', '--no-audit', '--no-fund', ...tarballs], project);
});

after(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  rmSync(work, { recursive: true, force: true });
});

const flow = (importLine: string) => `
${importLine}
const sdk = new QelosSDK({ appUrl: ${JSON.stringify('__URL__')}, fetch: globalThis.fetch });
await sdk.authentication.oAuthSignin({ username: 'a@x.com', password: 'pw' });
const me = await sdk.authentication.getLoggedInUser();
const list = await sdk.entities('todo').getList();
console.log(JSON.stringify({ me: me.email, first: list[0].metadata.title }));
`;

describe('the packed @qelos/sdk works from a clean project on plain Node', () => {
  test('ES module consumer: import against a real HTTP server', async () => {
    writeFileSync(join(project, 'esm.mjs'), flow("import QelosSDK from '@qelos/sdk';").replace('__URL__', baseUrl));
    requests.length = 0;
    assert.deepEqual(JSON.parse(await node(project, 'esm.mjs')), { me: 'a@x.com', first: 'one' });
    assert.deepEqual(requests.map((r) => `${r.method.toUpperCase()} ${r.url.split('?')[0]}`), ['POST /api/signin', 'GET /api/me', 'GET /api/blueprints/todo/entities']);
    assert.equal(requests[1].auth, 'Bearer tok-1');
  });

  test('CommonJS consumer: require against a real HTTP server', async () => {
    // CommonJS has no top-level await: wrap the flow in an async function
    const body = flow("const QelosSDK = require('@qelos/sdk').default;").replace('__URL__', baseUrl);
    writeFileSync(join(project, 'cjs.cjs'), `(async () => {${body}})().catch((e) => { console.error(e); process.exit(1); });`);
    requests.length = 0;
    assert.deepEqual(JSON.parse(await node(project, 'cjs.cjs')), { me: 'a@x.com', first: 'one' });
    assert.equal(requests.length, 3);
  });

  test('every public subpath loads in both module systems', async () => {
    for (const sub of ['', '/administrator', '/ai', '/types', '/workspaces', '/configurations', '/dist/authentication']) {
      await assert.doesNotReject(node(project, '-e', `require('@qelos/sdk${sub}')`), `require @qelos/sdk${sub}`);
      await assert.doesNotReject(node(project, '--input-type=module', '-e', `await import('@qelos/sdk${sub}')`), `import @qelos/sdk${sub}`);
    }
  });

  test('TypeScript consumers type-check under node10 and node16 resolution', () => {
    const ts = createRequire(join(sdkDir, 'package.json'))('typescript') as typeof import('typescript');
    const source = `import QelosSDK from '@qelos/sdk';
import Admin from '@qelos/sdk/administrator';
import type { IUser } from '@qelos/sdk/dist/authentication';
const sdk = new QelosSDK({ appUrl: 'http://x', fetch: fetch });
const admin = new Admin({ appUrl: 'http://x', fetch: fetch });
export const user: Promise<IUser> = sdk.authentication.getLoggedInUser();
export const users = admin.users.getList();
`;
    const modes: Array<[string, string, import('typescript').CompilerOptions]> = [
      ['node10', 'a.ts', { module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.NodeJs, esModuleInterop: true }],
      ['node16 (ES module file)', 'b.mts', { module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16 }],
      ['node16 (CommonJS file)', 'c.cts', { module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16 }],
    ];
    for (const [label, file, options] of modes) {
      writeFileSync(join(project, file), file.endsWith('.cts') ? source.replace(/^import QelosSDK from '@qelos\/sdk';/m, "import QelosSDK = require('@qelos/sdk');").replace(/^import Admin from '@qelos\/sdk\/administrator';/m, "import Admin = require('@qelos/sdk/administrator');") : source);
      const program = ts.createProgram([join(project, file)], { ...options, noEmit: true, strict: true, skipLibCheck: true, types: [], lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'], target: ts.ScriptTarget.ES2020 });
      const errors = ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
      // the .cts file uses `import x = require()`, whose default is the module object: only report resolution errors
      const relevant = file.endsWith('.cts') ? errors.filter((e) => /Cannot find module|could not be resolved|has no exported member/.test(e)) : errors;
      assert.deepEqual(relevant, [], `${label}: ${relevant.join(' | ')}`);
    }
  });
});
