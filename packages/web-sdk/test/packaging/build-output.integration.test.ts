import { before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { consumerScript, manifest, packageRoot } from './helpers';

/** These tests read the compiled output: run `pnpm build` first (CI builds packages before running tests). */
before(() => {
  assert.ok(existsSync(join(packageRoot, 'dist', 'index.js')), 'dist is missing: run `pnpm -F @qelos/web-sdk build` before the tests');
});

const dist = join(packageRoot, 'dist');

describe('dist layout', () => {
  test('both builds carry a package.json that says how to read their .js files', () => {
    assert.deepEqual(JSON.parse(readFileSync(join(dist, 'package.json'), 'utf8')), { type: 'module' });
    assert.deepEqual(JSON.parse(readFileSync(join(dist, 'cjs', 'package.json'), 'utf8')), { type: 'commonjs' });
  });

  test('the files main, module, types and the root export point at exist', () => {
    const root = manifest.exports['.'];
    for (const target of [manifest.main, manifest.module, manifest.types, root.import.default, root.import.types, root.require.default, root.require.types]) {
      assert.ok(existsSync(join(packageRoot, target)), target);
    }
  });

  test('every relative import in the ES module build resolves to a file', () => {
    const bad: string[] = [];
    for (const name of readdirSync(dist).filter((n) => n.endsWith('.js'))) {
      for (const m of readFileSync(join(dist, name), 'utf8').matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
        if (!existsSync(resolve(dist, m[1]))) bad.push(`${name}: ${m[1]}`);
      }
    }
    assert.deepEqual(bad, []);
  });

  test('both builds ship the same set of modules', () => {
    const js = (dir: string) => readdirSync(dir).filter((n) => n.endsWith('.js')).sort();
    assert.deepEqual(js(join(dist, 'cjs')), js(dist));
  });
});

describe('plain Node resolves the package through its exports map', () => {
  const run = (env: Record<string, string>) =>
    JSON.parse(execFileSync(process.execPath, ['--no-warnings', consumerScript], { cwd: packageRoot, env: { ...process.env, FETCH: 'stub', ...env }, encoding: 'utf8', timeout: 30_000 }).trim().split('\n').pop()!);

  for (const build of ['esm', 'cjs']) {
    test(`${build.toUpperCase()} build loads in a DOM and exposes the public API`, () => {
      const out = run({ BUILD: build });
      assert.deepEqual(out.exports, ['QelosChatWidget', 'authorize', 'code', 'unAuthorize']);
    });
  }

  test('deep dist paths resolve with and without the .js extension, in both module systems', () => {
    const probe = (code: string, esm: boolean) =>
      execFileSync(process.execPath, ['--no-warnings', ...(esm ? ['--input-type=module'] : []), '-e', code], { cwd: packageRoot, encoding: 'utf8' }).trim();
    for (const spec of ['@qelos/web-sdk/dist/qelos', '@qelos/web-sdk/dist/qelos.js', '@qelos/web-sdk/package.json']) {
      assert.equal(probe(`console.log(typeof require.resolve('${spec}'))`, false), 'string', `require.resolve ${spec}`);
      assert.equal(probe(`import { createRequire } from 'node:module'; console.log(typeof createRequire(process.cwd() + '/x.js').resolve('${spec}'))`, true), 'string', `resolve ${spec}`);
    }
  });
});

describe('TypeScript resolves the types for every module resolution mode', () => {
  const root = mkdtempSync(join(tmpdir(), 'qelos-web-sdk-types-'));
  mkdirSync(join(root, 'node_modules', '@qelos'), { recursive: true });
  symlinkSync(packageRoot, join(root, 'node_modules', '@qelos', 'web-sdk'), 'dir');

  const modes: Array<[string, ts.CompilerOptions, string, ts.ModuleKind | undefined]> = [
    ['node10 (moduleResolution: node)', { moduleResolution: ts.ModuleResolutionKind.NodeJs, module: ts.ModuleKind.CommonJS }, 'consumer.ts', undefined],
    ['node16, ES module consumer', { moduleResolution: ts.ModuleResolutionKind.Node16, module: ts.ModuleKind.Node16 }, 'consumer.mts', ts.ModuleKind.ESNext],
    ['node16, CommonJS consumer', { moduleResolution: ts.ModuleResolutionKind.Node16, module: ts.ModuleKind.Node16 }, 'consumer.cts', ts.ModuleKind.CommonJS],
  ];
  for (const [label, options, file, mode] of modes) {
    test(label, () => {
      const from = join(root, file);
      writeFileSync(from, '');
      const resolved = ts.resolveModuleName('@qelos/web-sdk', from, options, ts.sys, undefined, undefined, mode).resolvedModule;
      assert.ok(resolved && resolved.resolvedFileName.endsWith('.d.ts'), `${label}: ${resolved?.resolvedFileName}`);
    });
  }

  test('Node16 picks the ES module declarations for import and the CommonJS ones for require', () => {
    const options = { moduleResolution: ts.ModuleResolutionKind.Node16, module: ts.ModuleKind.Node16 };
    const esm = ts.resolveModuleName('@qelos/web-sdk', join(root, 'consumer.mts'), options, ts.sys, undefined, undefined, ts.ModuleKind.ESNext).resolvedModule!.resolvedFileName;
    const cjs = ts.resolveModuleName('@qelos/web-sdk', join(root, 'consumer.cts'), options, ts.sys, undefined, undefined, ts.ModuleKind.CommonJS).resolvedModule!.resolvedFileName;
    assert.match(esm, /dist[\\/]index\.d\.ts$/);
    assert.match(cjs, /dist[\\/]cjs[\\/]index\.d\.ts$/);
  });
});
