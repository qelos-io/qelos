// Dual build: ESM in dist/, CommonJS in dist/cjs/. A package.json in each folder tells Node how to read its .js files.
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = (project) => execFileSync('npx', ['tsc', '-p', project], { cwd: root, stdio: 'inherit' });

rmSync(join(root, 'dist'), { recursive: true, force: true });
tsc('tsconfig.esm.json');
tsc('tsconfig.cjs.json');
mkdirSync(join(root, 'dist', 'cjs'), { recursive: true });
writeFileSync(join(root, 'dist', 'package.json'), JSON.stringify({ type: 'module' }) + '\n');
writeFileSync(join(root, 'dist', 'cjs', 'package.json'), JSON.stringify({ type: 'commonjs' }) + '\n');

// Smoke check in plain Node: both builds must load (this catches extensionless relative imports in ESM).
const check = (args) => execFileSync(process.execPath, ['--no-warnings', ...args], { cwd: root, stdio: 'inherit' });
check(['--input-type=module', '-e', "const m = await import('./dist/index.js'); if (typeof m.default !== 'function') throw new Error('ESM build: default export is not the SDK class'); await import('./dist/administrator/index.js'); await import('./dist/ai/index.js');"]);
check(['-e', "const m = require('./dist/cjs/index.js'); if (typeof m.default !== 'function') throw new Error('CJS build: default export is not the SDK class'); require('./dist/cjs/administrator/index.js'); require('./dist/cjs/ai/index.js');"]);
console.log('@qelos/sdk: ESM and CJS builds load in plain Node');
