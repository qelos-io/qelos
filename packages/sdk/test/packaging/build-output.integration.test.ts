import { before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { buildExports, manifest, namedSubpaths, packageRoot } from './helpers';

/** These tests read the compiled output: run `pnpm build` first (CI builds packages before running tests). */
before(() => {
  assert.ok(existsSync(join(packageRoot, 'dist', 'index.js')), 'dist is missing: run `pnpm -F @qelos/sdk build` before the tests');
});

const dist = join(packageRoot, 'dist');

const run = (args: string[]) =>
  execFileSync(process.execPath, ['--no-warnings', ...args], { cwd: packageRoot, encoding: 'utf8', timeout: 30_000 }).trim();

const specifier = (subpath: string) => (subpath === '.' ? '@qelos/sdk' : `@qelos/sdk/${subpath.slice(2)}`);

describe('dist layout', () => {
  test('both builds carry a package.json that says how to read their .js files', () => {
    assert.deepEqual(JSON.parse(readFileSync(join(dist, 'package.json'), 'utf8')), { type: 'module' });
    assert.deepEqual(JSON.parse(readFileSync(join(dist, 'cjs', 'package.json'), 'utf8')), { type: 'commonjs' });
  });

  test('every file an export points at exists (ESM, CJS and their types)', () => {
    const missing: string[] = [];
    for (const [key, entry] of buildExports) {
      if (key.includes('*')) continue;
      for (const target of [entry.import.default, entry.import.types, entry.require.default, entry.require.types]) {
        if (!existsSync(join(packageRoot, target))) missing.push(`${key}: ${target}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test('every relative import in the ES module build resolves to a file', () => {
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (path === join(dist, 'cjs')) continue;
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.js')) {
          for (const m of readFileSync(path, 'utf8').matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
            if (!existsSync(resolve(dirname(path), m[1]))) bad.push(`${path.slice(dist.length + 1)}: ${m[1]}`);
          }
        }
      }
    };
    walk(dist);
    assert.deepEqual(bad, []);
  });

  test('the CommonJS build really is CommonJS and the ES module build is not', () => {
    assert.match(readFileSync(join(dist, 'cjs', 'index.js'), 'utf8'), /require\(["']\.\//);
    assert.match(readFileSync(join(dist, 'index.js'), 'utf8'), /^import /m);
  });
});

describe('plain Node loads every public subpath through the exports map', () => {
  for (const subpath of namedSubpaths) {
    test(`${specifier(subpath)}: import() and require() both load`, () => {
      // "./types" only has type declarations, so its runtime module is legitimately empty: loading it must not throw
      const expected = subpath === './types' ? 'loaded' : 'exports';
      const probe = (m: string) => `console.log(Object.keys(${m}).length > 0 ? 'exports' : 'loaded')`;
      assert.equal(run(['--input-type=module', '-e', `const m = await import('${specifier(subpath)}'); ${probe('m')}`]), expected);
      assert.equal(run(['-e', `const m = require('${specifier(subpath)}'); ${probe('m')}`]), expected);
    });
  }

  test('the root and administrator default exports are the SDK classes in both module systems', () => {
    const out = run([
      '--input-type=module',
      '-e',
      `import { createRequire } from 'node:module';
       const require = createRequire(import.meta.url);
       const esm = await import('@qelos/sdk'); const cjs = require('@qelos/sdk');
       const adm = await import('@qelos/sdk/administrator'); const admCjs = require('@qelos/sdk/administrator');
       console.log([typeof esm.default, typeof cjs.default, typeof adm.default, typeof admCjs.default].join(','))`,
    ]);
    assert.equal(out, 'function,function,function,function');
  });

  test('deep dist paths used by the integrators keep resolving, with and without a loader', () => {
    assert.equal(run(['-e', `console.log(typeof require('@qelos/sdk/dist/authentication').default)`]), 'function');
    assert.equal(run(['--input-type=module', '-e', `console.log(typeof (await import('@qelos/sdk/dist/authentication')).default)`]), 'function');
  });
});

describe('TypeScript resolves the types for every module resolution mode', () => {
  const root = mkdtempSync(join(tmpdir(), 'qelos-sdk-types-'));
  mkdirSync(join(root, 'node_modules', '@qelos'), { recursive: true });
  symlinkSync(packageRoot, join(root, 'node_modules', '@qelos', 'sdk'), 'dir');

  const specs = ['@qelos/sdk', '@qelos/sdk/administrator', '@qelos/sdk/ai', '@qelos/sdk/types', '@qelos/sdk/workspaces', '@qelos/sdk/dist/authentication'];
  const modes: Array<[string, ts.CompilerOptions, string]> = [
    ['node10 (moduleResolution: node)', { moduleResolution: ts.ModuleResolutionKind.NodeJs, module: ts.ModuleKind.CommonJS }, 'consumer.ts'],
    ['node16, ES module consumer', { moduleResolution: ts.ModuleResolutionKind.Node16, module: ts.ModuleKind.Node16 }, 'consumer.mts'],
    ['node16, CommonJS consumer', { moduleResolution: ts.ModuleResolutionKind.Node16, module: ts.ModuleKind.Node16 }, 'consumer.cts'],
  ];

  for (const [label, options, file] of modes) {
    test(label, () => {
      const from = join(root, file);
      writeFileSync(from, '');
      const unresolved: string[] = [];
      for (const spec of specs) {
        const result = ts.resolveModuleName(spec, from, options, ts.sys).resolvedModule;
        if (!result || !result.resolvedFileName.endsWith('.d.ts')) unresolved.push(spec);
      }
      assert.deepEqual(unresolved, []);
    });
  }

  test('Node16 picks the ES module declarations for import and the CommonJS ones for require', () => {
    const options = { moduleResolution: ts.ModuleResolutionKind.Node16, module: ts.ModuleKind.Node16 };
    writeFileSync(join(root, 'a.mts'), '');
    writeFileSync(join(root, 'b.cts'), '');
    // the resolution mode is what the importing file's module format decides (import vs require condition)
    const esm = ts.resolveModuleName('@qelos/sdk', join(root, 'a.mts'), options, ts.sys, undefined, undefined, ts.ModuleKind.ESNext).resolvedModule!.resolvedFileName;
    const cjs = ts.resolveModuleName('@qelos/sdk', join(root, 'b.cts'), options, ts.sys, undefined, undefined, ts.ModuleKind.CommonJS).resolvedModule!.resolvedFileName;
    assert.match(esm, /dist[\\/]index\.d\.ts$/);
    assert.match(cjs, /dist[\\/]cjs[\\/]index\.d\.ts$/);
  });
});
