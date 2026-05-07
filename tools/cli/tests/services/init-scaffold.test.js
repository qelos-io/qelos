const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'qelos-init-test-'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

describe('init scaffold (framework detection & templates)', async () => {
  const scaffoldUrl = pathToFileURL(path.join(__dirname, '..', '..', 'services', 'init', 'scaffold.mjs')).href;
  const {
    detectFramework,
    buildJsConfigContents,
    shouldUseTypeScript,
    shouldUseESModule,
  } = await import(scaffoldUrl);

  const tmpDirs = [];

  after(() => {
    for (const d of tmpDirs) {
      try {
        fs.rmSync(d, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it('detects Next.js from package.json', () => {
    const dir = mkTempDir();
    tmpDirs.push(dir);
    writeJson(path.join(dir, 'package.json'), {
      dependencies: { next: '14.0.0' },
    });
    assert.deepStrictEqual(detectFramework(dir), { id: 'next', source: 'package.json' });
  });

  it('prefers NestJS over Express when both are present', () => {
    const dir = mkTempDir();
    tmpDirs.push(dir);
    writeJson(path.join(dir, 'package.json'), {
      dependencies: { express: '^4.0.0', '@nestjs/core': '^10.0.0' },
    });
    assert.deepStrictEqual(detectFramework(dir), { id: 'nest', source: 'package.json' });
  });

  it('detects FastAPI from requirements.txt', () => {
    const dir = mkTempDir();
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'requirements.txt'), 'fastapi>=0.100\n');
    assert.deepStrictEqual(detectFramework(dir), { id: 'fastapi', source: 'requirements.txt' });
  });

  it('TypeScript config template imports QelosConfig from @qelos/global-types', () => {
    const body = buildJsConfigContents(true, false);
    assert.ok(body.includes("from '@qelos/global-types'"));
    assert.ok(!body.includes("from '@qelos/sdk'"));
  });

  it('JS config uses @qelos/global-types in JSDoc and CommonJS when not ESM', () => {
    const body = buildJsConfigContents(false, false);
    assert.ok(body.includes("import('@qelos/global-types').QelosConfig"));
    assert.ok(body.includes('module.exports = config'));
  });

  it('JS config uses export default when package is ESM', () => {
    const body = buildJsConfigContents(false, true);
    assert.ok(body.includes('export default config'));
    assert.ok(!body.includes('module.exports'));
  });

  it('shouldUseTypeScript is true when typescript is a devDependency', () => {
    const dir = mkTempDir();
    tmpDirs.push(dir);
    writeJson(path.join(dir, 'package.json'), {
      devDependencies: { typescript: '^5.0.0' },
    });
    assert.equal(shouldUseTypeScript(dir, 'next'), true);
  });

  it('shouldUseESModule is true when package.json has type module', () => {
    const dir = mkTempDir();
    tmpDirs.push(dir);
    writeJson(path.join(dir, 'package.json'), { type: 'module' });
    assert.equal(shouldUseESModule(dir), true);
  });
});
