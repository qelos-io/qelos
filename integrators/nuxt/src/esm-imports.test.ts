import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** This package ships ES modules: Node resolves an import only when it names the file, extension included. */
const src = dirname(fileURLToPath(import.meta.url));
const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.ts') && !path.endsWith('.test.ts') && !path.endsWith('.d.ts')) files.push(path);
  }
};
walk(src);

const specifiers = () =>
  files.flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/(?:from\s+|import\s*\(\s*|^import\s+)['"]([^'"]+)['"]/gm)].map((m) => ({
      file: file.slice(src.length + 1),
      spec: m[1],
    })),
  );

test('relative imports carry the .js extension', () => {
  const bad = specifiers().filter(({ spec }) => spec.startsWith('.') && !/\.(js|json)$/.test(spec));
  assert.deepEqual(bad, []);
});

test('imports of next subpaths carry the .js extension (next has no exports map)', () => {
  const bad = specifiers().filter(({ spec }) => spec.startsWith('next/') && !spec.endsWith('.js'));
  assert.deepEqual(bad, []);
});
