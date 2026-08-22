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
    parsePackageVersion,
    validateFrameworkVersion,
    getFrameworkPackageVersion,
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
    assert.deepStrictEqual(detectFramework(dir), {
      id: 'next',
      source: 'package.json',
      version: '14.0.0',
    });
  });

  it('prefers NestJS over Express when both are present', () => {
    const dir = mkTempDir();
    tmpDirs.push(dir);
    writeJson(path.join(dir, 'package.json'), {
      dependencies: { express: '^4.0.0', '@nestjs/core': '^10.0.0' },
    });
    assert.deepStrictEqual(detectFramework(dir), {
      id: 'nest',
      source: 'package.json',
      version: '^10.0.0',
    });
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

  it('parsePackageVersion strips range prefixes and workspace protocols', () => {
    assert.deepStrictEqual(parsePackageVersion('^3.2.1'), { major: 3, minor: 2, patch: 1 });
    assert.deepStrictEqual(parsePackageVersion('~14.0.0'), { major: 14, minor: 0, patch: 0 });
    assert.deepStrictEqual(parsePackageVersion('>=13.4.0'), { major: 13, minor: 4, patch: 0 });
    assert.equal(parsePackageVersion('workspace:*'), null);
    assert.equal(parsePackageVersion('catalog:'), null);
    assert.deepStrictEqual(parsePackageVersion('npm:next@15.1.0'), { major: 15, minor: 1, patch: 0 });
  });

  it('validateFrameworkVersion warns for Nuxt 2.x and passes for Nuxt 3+ / 4+', () => {
    const nuxt2 = validateFrameworkVersion('nuxt', '^2.15.0');
    assert.equal(nuxt2.ok, false);
    assert.match(nuxt2.message, /@qelos\/integrator-nuxt requires Nuxt >=3\.0\.0/);
    assert.match(nuxt2.message, /found nuxt@\^2\.15\.0/);

    assert.equal(validateFrameworkVersion('nuxt', '^3.12.0').ok, true);
    assert.equal(validateFrameworkVersion('nuxt', '^4.0.0').ok, true);
  });

  it('validateFrameworkVersion enforces minimums for next, express, fastify, and nest', () => {
    assert.equal(validateFrameworkVersion('next', '13.3.0').ok, false);
    assert.equal(validateFrameworkVersion('next', '13.4.0').ok, true);
    assert.equal(validateFrameworkVersion('next', '^15.0.0').ok, true);

    assert.equal(validateFrameworkVersion('express', '4.16.9').ok, false);
    assert.equal(validateFrameworkVersion('express', '^4.17.0').ok, true);

    assert.equal(validateFrameworkVersion('fastify', '3.29.5').ok, false);
    assert.equal(validateFrameworkVersion('fastify', '^4.0.0').ok, true);

    assert.equal(validateFrameworkVersion('nest', '^8.0.0').ok, false);
    assert.equal(validateFrameworkVersion('nest', '^9.0.0').ok, true);
  });

  it('getFrameworkPackageVersion reads the framework dependency from package.json', () => {
    const dir = mkTempDir();
    tmpDirs.push(dir);
    writeJson(path.join(dir, 'package.json'), {
      devDependencies: { nuxt: '^3.0.0' },
    });
    assert.equal(getFrameworkPackageVersion(dir, 'nuxt'), '^3.0.0');
  });
});
