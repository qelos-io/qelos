import { describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildExports, manifest, packageRoot } from './helpers';

describe('package.json: dual build manifest', () => {
  test('main points at the CommonJS build, module and types at the ES module build', () => {
    assert.equal(manifest.main, './dist/cjs/index.js');
    assert.equal(manifest.module, './dist/index.js');
    assert.equal(manifest.types, './dist/index.d.ts');
  });

  test('every public export has matching import and require conditions with types', () => {
    assert.ok(buildExports.length >= 6, 'expected the root and its subpaths');
    for (const [key, entry] of buildExports) {
      const esm = entry.import?.default;
      const cjs = entry.require?.default;
      assert.ok(esm && cjs, `${key}: needs import.default and require.default`);
      assert.ok(esm.startsWith('./dist/') && !esm.startsWith('./dist/cjs/'), `${key}: import must target the ES module build, got ${esm}`);
      assert.equal(cjs, esm.replace('./dist/', './dist/cjs/'), `${key}: require must mirror import under dist/cjs`);
      assert.equal(entry.import.types, esm.replace(/\.js$/, '.d.ts'), `${key}: import types`);
      assert.equal(entry.require.types, cjs.replace(/\.js$/, '.d.ts'), `${key}: require types`);
      assert.equal(entry.default, esm, `${key}: plain "default" falls back to the ES module build`);
    }
  });

  test('"types" comes first inside each condition so TypeScript picks it up', () => {
    for (const [key, entry] of buildExports) {
      assert.equal(Object.keys(entry.import)[0], 'types', `${key}: import`);
      assert.equal(Object.keys(entry.require)[0], 'types', `${key}: require`);
    }
  });

  test('the raw src and package.json entries are still exposed (backward compatibility)', () => {
    assert.ok(manifest.exports['./package.json']);
    assert.ok(manifest.exports['./src']);
    assert.ok(manifest.exports['./dist/*']);
  });

  test('typesVersions keeps TypeScript node10 resolution working (regression: types field must not be remapped)', () => {
    const map = manifest.typesVersions['*'];
    assert.deepEqual(map['dist/*'], ['./dist/*'], 'a dist/* mapping must beat the catch-all, or ./dist/index.d.ts becomes ./dist/dist/index.d.ts.d.ts');
    for (const bare of ['administrator', 'ai', 'workspaces', 'configurations', 'types']) {
      assert.ok(map[bare], `bare subpath "${bare}" needs its own mapping`);
    }
  });

  test('the build script writes both builds and the package ships it', () => {
    assert.match(manifest.scripts.build, /scripts\/build\.mjs/);
  });
});

describe('source: relative imports are valid ES module specifiers', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (path.endsWith('.ts') && !path.endsWith('.d.ts')) files.push(path);
    }
  };
  walk(join(packageRoot, 'src'));

  test('every relative import and re-export names its file with the .js extension', () => {
    const bad: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/^\s*(?:import|export)\b[^'"\n;]*?\bfrom\s*['"](\.{1,2}(?:\/[^'"]*)?)['"]|^\s*import\s*['"](\.{1,2}(?:\/[^'"]*)?)['"]/gm)) {
        const spec = m[1] ?? m[2];
        if (!spec.endsWith('.js')) bad.push(`${file.slice(packageRoot.length + 1)}: ${spec}`);
      }
    }
    assert.deepEqual(bad, [], 'extensionless relative imports break plain Node ESM');
  });

  test('every ".js" relative import points at a real .ts source file or directory index', () => {
    const missing: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/from\s*['"](\.{1,2}\/[^'"]*\.js)['"]/g)) {
        const target = resolve(dirname(file), m[1].replace(/\.js$/, '.ts'));
        try {
          statSync(target);
        } catch {
          missing.push(`${file.slice(packageRoot.length + 1)}: ${m[1]}`);
        }
      }
    }
    assert.deepEqual(missing, []);
  });
});
