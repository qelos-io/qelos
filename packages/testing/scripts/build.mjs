// Dual build: ES modules in dist/ (the package is "type": "module"), CommonJS in dist/cjs/ for runners that load
// packages with require(), such as Jest in its default mode.
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tsc = (project) => execFileSync('npx', ['tsc', '-p', project], { cwd: root, stdio: 'inherit' });

rmSync(join(root, 'dist'), { recursive: true, force: true });
tsc('tsconfig.json');
tsc('tsconfig.cjs.json');
writeFileSync(join(root, 'dist', 'cjs', 'package.json'), JSON.stringify({ type: 'commonjs' }) + '\n');

// Both builds must load in plain Node (the entry points that import @qelos/sdk need the SDK built).
const entries = ['index.js', 'sdk/index.js', 'fixtures/index.js', 'http/index.js', 'cassette/index.js'];
const check = (code, args = []) => execFileSync(process.execPath, ['--no-warnings', ...args, '-e', code], { cwd: root, stdio: 'inherit' });
check(`for (const e of ${JSON.stringify(entries)}) require('./dist/cjs/' + e)`);
check(`for (const e of ${JSON.stringify(entries)}) await import('./dist/' + e)`, ['--input-type=module']);
console.log('@qelos/testing: ES module and CommonJS builds load in plain Node');
