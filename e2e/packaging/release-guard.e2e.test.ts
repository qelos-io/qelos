import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The release publishes from the working folder: it must stop when a package holds files of this machine only. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const guard = import(join(ROOT, 'scripts', 'release-guard.mjs'));

const publicDirs = [
  ...['packages', 'integrators'].flatMap((folder) => readdirSync(join(ROOT, folder)).map((name) => `${folder}/${name}`)),
  'tools/cli',
].filter((dir) => {
  const file = join(ROOT, dir, 'package.json');
  return existsSync(file) && !JSON.parse(readFileSync(file, 'utf8')).private;
});

const temporary: string[] = [];
after(() => temporary.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function write(root: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
}

/**
 * A copy of the release scripts in a temporary repository, with an empty package wherever they expect one. The
 * packages are `private`, so npm refuses to publish them whatever the scripts do.
 */
function repository(committed: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'qelos-release-'));
  temporary.push(root);
  cpSync(join(ROOT, 'scripts'), join(root, 'scripts'), { recursive: true });
  for (const dir of publicDirs) {
    write(root, { [`${dir}/package.json`]: JSON.stringify({ name: `fixture-${dir.replace('/', '-')}`, version: '1.0.0', private: true }) });
  }
  for (const dir of ['packages/python-sdk', 'integrators/fastapi']) {
    write(root, { [`${dir}/pyproject.toml`]: '[project]\nname = "fixture"\nversion = "1.0.0"\n' });
  }
  write(root, committed);
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  execFileSync('git', ['add', '--all'], { cwd: root });
  return root;
}

describe('localOnlyFiles', () => {
  test('flags what git does not track, except build output', async () => {
    const { localOnlyFiles } = await guard;
    const root = repository({ 'packages/sdk/index.js': '', 'packages/sdk/.nvmrc': '24' });
    write(join(root, 'packages/sdk'), {
      'dist/index.js': '',
      'notes.txt': 'scratch',
      '.claude/settings.local.json': '{}',
      '.impeccable/hook.cache.json': '{}',
      'tmp/tmp.js': '',
      '.env': 'TOKEN=x',
    });
    assert.deepEqual(localOnlyFiles(join(root, 'packages/sdk')).sort(), [
      '.claude/settings.local.json',
      '.env',
      '.impeccable/hook.cache.json',
      'notes.txt',
      'tmp/tmp.js',
    ]);
  });

  test('flags environment files and keys even when committed or built; an example file is fine', async () => {
    const { localOnlyFiles } = await guard;
    const root = repository({ 'packages/sdk/.env.production': '', 'packages/sdk/.env.example': '', 'packages/sdk/server.pem': '' });
    write(join(root, 'packages/sdk'), { 'dist/.env': '' });
    assert.deepEqual(localOnlyFiles(join(root, 'packages/sdk')).sort(), ['.env.production', 'dist/.env', 'server.pem']);
  });

  test('every package of this repository is clean', async () => {
    const { localOnlyFiles } = await guard;
    const found = publicDirs.flatMap((dir) => localOnlyFiles(join(ROOT, dir)).map((file: string) => `${dir}/${file}`));
    assert.deepEqual(found, []);
  });
});

const releases = {
  'publish.mjs': ['--dry-run', '--skip-install', '--skip-build', '--skip-test', '--skip-login', '--skip-python', '--only', 'sdk'],
  'publish-packages.mjs': ['--dry-run', '--only', 'sdk'],
};

for (const [script, args] of Object.entries(releases)) {
  test(`scripts/${script} stops before publishing when a package holds a local file`, () => {
    const root = repository();
    const release = () => spawnSync(process.execPath, [join(root, 'scripts', script), ...args], { cwd: root, encoding: 'utf8' });

    const clean = release();
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);
    assert.match(clean.stdout, /pnpm publish/);

    write(root, { 'packages/sdk/.claude/settings.local.json': '{}' });
    const stopped = release();
    assert.equal(stopped.status, 1);
    assert.match(stopped.stdout + stopped.stderr, /packages\/sdk\/\.claude\/settings\.local\.json/);
    assert.doesNotMatch(stopped.stdout, /pnpm publish/);
  });
}
