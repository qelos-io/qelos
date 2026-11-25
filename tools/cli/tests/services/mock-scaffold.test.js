const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const url = (...p) => pathToFileURL(path.join(__dirname, '..', '..', ...p)).href;

describe('qelos mock scaffold', () => {
  const tmpDirs = [];
  const tmp = () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qelos-mock-cli-'));
    tmpDirs.push(d);
    return d;
  };
  after(() => tmpDirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

  it('creates personas, workspaces, state/ and README', async () => {
    const { scaffoldMockFolder } = await import(url('services', 'mock', 'scaffold.mjs'));
    const dir = path.join(tmp(), 'qelos-mock');
    const { created } = scaffoldMockFolder(dir);
    assert.ok(created.length >= 4);
    const personas = JSON.parse(fs.readFileSync(path.join(dir, 'personas.json'), 'utf-8'));
    assert.deepStrictEqual(personas.map((p) => p.email), ['admin@example.com', 'member@example.com', 'guest@example.com']);
    assert.ok(personas.every((p) => Array.isArray(p.roles) && p.workspaces[0].labels.length));
    assert.ok(Array.isArray(JSON.parse(fs.readFileSync(path.join(dir, 'workspaces.json'), 'utf-8'))));
    assert.ok(fs.statSync(path.join(dir, 'state')).isDirectory());
    assert.ok(fs.readFileSync(path.join(dir, 'README.md'), 'utf-8').includes('QELOS_MOCK=./qelos-mock'));
  });

  it('keeps existing files unless force is set', async () => {
    const { scaffoldMockFolder } = await import(url('services', 'mock', 'scaffold.mjs'));
    const dir = path.join(tmp(), 'm');
    scaffoldMockFolder(dir);
    fs.writeFileSync(path.join(dir, 'personas.json'), '[]');
    const second = scaffoldMockFolder(dir);
    assert.strictEqual(second.created.length, 0);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'personas.json'), 'utf-8'), '[]');
    scaffoldMockFolder(dir, { force: true });
    assert.ok(JSON.parse(fs.readFileSync(path.join(dir, 'personas.json'), 'utf-8')).length === 3);
  });

  it('mockHintFor prints the QELOS_MOCK hint per framework', async () => {
    const { mockHintFor } = await import(url('services', 'mock', 'scaffold.mjs'));
    assert.ok(mockHintFor('express')[0].startsWith('QELOS_MOCK=./qelos-mock'));
    assert.ok(mockHintFor('next').join('\n').includes('qelos mock serve ./qelos-mock'));
    assert.ok(mockHintFor('fastapi').join('\n').includes('QELOS_MOCK=./qelos-mock uvicorn'));
  });

  it('mock init controller scaffolds the folder', async () => {
    const { mockInitController } = await import(url('controllers', 'mock.mjs'));
    const dir = path.join(tmp(), 'out');
    await mockInitController({ dir });
    assert.ok(fs.existsSync(path.join(dir, 'personas.json')));
  });

  it('generates random per-persona passwords (no well-known defaults)', async () => {
    const { scaffoldMockFolder } = await import(url('services', 'mock', 'scaffold.mjs'));
    const { credentials } = scaffoldMockFolder(path.join(tmp(), 'm'));
    const pw = credentials.map((c) => c.password);
    assert.strictEqual(new Set(pw).size, 3);
    assert.ok(pw.every((p) => p.length >= 12 && !/-pass$/.test(p)));
  });

  it('mock init --dump/--pull call the existing controllers with the folder', async () => {
    const { mockInitController } = await import(url('controllers', 'mock.mjs'));
    const dir = path.join(tmp(), 'wired');
    const calls = [];
    const rec = (name) => async (args) => calls.push([name, args]);
    await mockInitController({
      dir, dump: true, pull: true,
      deps: { 'dump-users': rec('users'), 'dump-workspaces': rec('workspaces'), 'dump-blueprints': rec('blueprints'), pull: rec('pull') },
    });
    assert.deepStrictEqual(calls, [
      ['users', { path: dir }],
      ['workspaces', { path: dir }],
      ['blueprints', { blueprints: 'all', path: dir }],
      ['pull', { type: 'all', path: dir }],
    ]);
    assert.ok(fs.existsSync(path.join(dir, 'personas.json')));
  });

  it('resolveDevMockBin finds the dev-mock bin from a project that installs it', async () => {
    const { resolveDevMockBin } = await import(url('controllers', 'mock.mjs'));
    const root = tmp();
    const pkgDir = path.join(root, 'node_modules', '@qelos', 'dev-mock');
    fs.mkdirSync(path.join(pkgDir, 'dist', 'cli'), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: '@qelos/dev-mock', bin: { 'qelos-dev-mock': './dist/cli/bin.js' } }));
    fs.writeFileSync(path.join(pkgDir, 'dist', 'cli', 'bin.js'), '');
    assert.strictEqual(resolveDevMockBin(root), path.join(pkgDir, 'dist', 'cli', 'bin.js'));
  });

  it('the mock command is registered with init and serve subcommands', () => {
    const content = fs.readFileSync(path.join(__dirname, '..', '..', 'commands', 'mock.mjs'), 'utf-8');
    assert.ok(content.includes("'init [dir]'") && content.includes("'serve [dir]'"));
  });
});
