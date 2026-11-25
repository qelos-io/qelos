// Dual build: ESM in dist/, CommonJS in dist/cjs/. A package.json in each folder tells Node how to read its .js files.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = (project) => execFileSync('npx', ['tsc', '-p', project], { cwd: root, stdio: 'inherit' });

rmSync(join(root, 'dist'), { recursive: true, force: true });
tsc('tsconfig.esm.json');
tsc('tsconfig.cjs.json');
mkdirSync(join(root, 'dist', 'cjs'), { recursive: true });
writeFileSync(join(root, 'dist', 'package.json'), JSON.stringify({ type: 'module' }) + '\n');
writeFileSync(join(root, 'dist', 'cjs', 'package.json'), JSON.stringify({ type: 'commonjs' }) + '\n');

// This is a browser library, so it cannot be loaded in Node to check it. Instead make sure every relative
// import in the ES module build names a file that exists (extensionless imports are what broke plain ESM before).
const dist = join(root, 'dist');
const missing = [];
for (const name of readdirSync(dist)) {
  if (!name.endsWith('.js')) continue;
  const text = readFileSync(join(dist, name), 'utf8');
  for (const m of text.matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const target = resolve(dist, m[1]);
    if (!existsSync(target) || !statSync(target).isFile()) missing.push(`${name}: ${m[1]}`);
  }
}
if (missing.length) {
  console.error('@qelos/web-sdk: ES module build has relative imports that do not resolve to a file:\n  ' + missing.join('\n  '));
  process.exit(1);
}
console.log('@qelos/web-sdk: ESM and CJS builds written, all relative imports resolve');
