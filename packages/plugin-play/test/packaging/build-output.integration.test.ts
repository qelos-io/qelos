import { before, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { manifest, packageRoot } from './helpers';

/** These tests read the compiled output: run `pnpm build` first (CI builds packages before running tests). */
before(() => {
  assert.ok(existsSync(join(packageRoot, 'dist', 'index.js')), 'dist is missing: run `pnpm -F @qelos/plugin-play build` before the tests');
});

const dist = join(packageRoot, 'dist');
const jsFiles = () => readdirSync(dist).filter((n) => n.endsWith('.js'));

describe('dist is CommonJS that Node can load as is', () => {
  test('no compiled file uses import/export syntax', () => {
    const esm = jsFiles().filter((f) => /^(import|export)\s/m.test(readFileSync(join(dist, f), 'utf8')));
    assert.deepEqual(esm, []);
  });

  test('every relative require() in dist points at a file that exists', () => {
    const bad: string[] = [];
    for (const f of jsFiles()) {
      for (const m of readFileSync(join(dist, f), 'utf8').matchAll(/require\("(\.{1,2}\/[^"]+)"\)/g)) {
        const target = resolve(dist, m[1]);
        if (!existsSync(target) && !existsSync(target + '.js')) bad.push(`${f}: ${m[1]}`);
      }
    }
    assert.deepEqual(bad, []);
  });

  test('main and types exist', () => {
    assert.ok(existsSync(join(packageRoot, manifest.main)));
    assert.ok(existsSync(join(packageRoot, manifest.types)));
  });
});

describe('TypeScript resolves the types for every module resolution mode', () => {
  const root = mkdtempSync(join(tmpdir(), 'qelos-plugin-play-types-'));
  mkdirSync(join(root, 'node_modules', '@qelos'), { recursive: true });
  symlinkSync(packageRoot, join(root, 'node_modules', '@qelos', 'plugin-play'), 'dir');

  const modes: Array<[string, ts.CompilerOptions, string]> = [
    ['node10 (moduleResolution: node)', { moduleResolution: ts.ModuleResolutionKind.NodeJs, module: ts.ModuleKind.CommonJS }, 'consumer.ts'],
    ['node16, ES module consumer', { moduleResolution: ts.ModuleResolutionKind.Node16, module: ts.ModuleKind.Node16 }, 'consumer.mts'],
    ['node16, CommonJS consumer', { moduleResolution: ts.ModuleResolutionKind.Node16, module: ts.ModuleKind.Node16 }, 'consumer.cts'],
  ];
  for (const [label, options, file] of modes) {
    test(label, () => {
      const from = join(root, file);
      writeFileSync(from, '');
      const resolved = ts.resolveModuleName('@qelos/plugin-play', from, options, ts.sys, undefined, undefined, file.endsWith('.mts') ? ts.ModuleKind.ESNext : undefined).resolvedModule;
      assert.ok(resolved && resolved.resolvedFileName.endsWith('.d.ts'), `${label}: ${resolved?.resolvedFileName}`);
      assert.equal(dirname(resolved!.resolvedFileName).endsWith('dist'), true);
    });
  }
});
