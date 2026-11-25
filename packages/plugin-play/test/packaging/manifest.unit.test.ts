import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { manifest, packageRoot } from './helpers';

describe('package.json and tsconfig: CommonJS output', () => {
  test('main points at the build and types are explicit (main is CommonJS, so TypeScript needs the field)', () => {
    assert.equal(manifest.main, './dist/index.js');
    assert.equal(manifest.types, './dist/index.d.ts');
  });

  test('there is no exports map, so every deep import that worked before keeps working (backward compatibility)', () => {
    assert.equal(manifest.exports, undefined);
  });

  test('the package is not marked as an ES module', () => {
    assert.notEqual(manifest.type, 'module');
  });

  test('the compiler emits CommonJS: the source calls require() at runtime, which ES modules do not have', () => {
    const tsconfig = JSON.parse(readFileSync(join(packageRoot, 'tsconfig.json'), 'utf8'));
    assert.equal(tsconfig.compilerOptions.module.toLowerCase(), 'commonjs');
    const sources = ['app.ts', 'cache-manager.ts', 'manifest.ts'].map((f) => readFileSync(join(packageRoot, 'src', f), 'utf8'));
    assert.ok(sources.some((s) => /\brequire\(/.test(s)), 'if require() is gone from src, an ES module build could be reconsidered');
  });
});
