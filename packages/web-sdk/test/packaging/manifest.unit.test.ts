import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { manifest, packageRoot } from './helpers';

describe('package.json: dual build manifest', () => {
  test('main points at the CommonJS build, module and types at the ES module build', () => {
    assert.equal(manifest.main, './dist/cjs/index.js');
    assert.equal(manifest.module, './dist/index.js');
    assert.equal(manifest.types, './dist/index.d.ts');
  });

  test('the root export has import and require conditions with types, "types" first', () => {
    const root = manifest.exports['.'];
    assert.deepEqual(root.import, { types: './dist/index.d.ts', default: './dist/index.js' });
    assert.deepEqual(root.require, { types: './dist/cjs/index.d.ts', default: './dist/cjs/index.js' });
    assert.equal(root.default, './dist/index.js');
    assert.equal(Object.keys(root.import)[0], 'types');
    assert.equal(Object.keys(root.require)[0], 'types');
  });

  test('deep paths keep working as before the exports map existed (backward compatibility)', () => {
    // dist/<name> with and without .js, any other file, and package.json
    assert.equal(manifest.exports['./dist/*.js'].import.default, './dist/*.js');
    assert.equal(manifest.exports['./dist/*.js'].require.default, './dist/cjs/*.js');
    assert.equal(manifest.exports['./dist/*'].import.default, './dist/*.js');
    assert.equal(manifest.exports['./dist/*'].require.default, './dist/cjs/*.js');
    assert.equal(manifest.exports['./*'], './*');
    assert.equal(manifest.exports['./package.json'], './package.json');
  });

  test('the build script writes both builds', () => {
    assert.match(manifest.scripts.build, /scripts\/build\.mjs/);
  });
});

describe('source: relative imports are valid ES module specifiers', () => {
  test('every relative import and re-export in src names its file with the .js extension', () => {
    const bad: string[] = [];
    for (const name of readdirSync(join(packageRoot, 'src')).filter((n) => n.endsWith('.ts'))) {
      const text = readFileSync(join(packageRoot, 'src', name), 'utf8');
      for (const m of text.matchAll(/^\s*(?:import|export)\b[^'"\n;]*?\bfrom\s*['"](\.{1,2}\/[^'"]*)['"]|^\s*import\s*['"](\.{1,2}\/[^'"]*)['"]/gm)) {
        const spec = m[1] ?? m[2];
        if (!spec.endsWith('.js')) bad.push(`${name}: ${spec}`);
      }
    }
    assert.deepEqual(bad, [], 'extensionless relative imports break native ES module resolution');
  });
});
