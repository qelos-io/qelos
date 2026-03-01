import { existsSync } from 'node:fs';
import {
  setGlobal,
  deleteGlobal,
  getGlobal,
  readGlobalEnvFile,
  GLOBAL_ENV_DIR,
} from '../services/config/global-env.mjs';
import { getEnvFiles } from '../services/config/load-env.mjs';
import { join } from 'node:path';

export function globalSetController(argv) {
  const name = argv.name || 'default';
  const dir = process.cwd();
  setGlobal(name, dir);
  console.log(`Global env "${name}" set to: ${dir}`);
  console.log(`Stored in: ${GLOBAL_ENV_DIR}`);
}

export function globalDeleteController(argv) {
  const name = argv.name || 'default';
  const removed = deleteGlobal(name);
  if (removed) {
    console.log(`Global env "${name}" removed.`);
  } else {
    console.warn(`Global env "${name}" not found in ${GLOBAL_ENV_DIR}`);
    process.exit(1);
  }
}

export function globalListController(_argv) {
  const all = readGlobalEnvFile();
  const entries = Object.entries(all);
  if (entries.length === 0) {
    console.log(`No global environments registered in ${GLOBAL_ENV_DIR}`);
    return;
  }
  console.log(`Global environments (${GLOBAL_ENV_DIR}):\n`);
  for (const [n, dir] of entries) {
    const exists = existsSync(dir);
    console.log(`  ${n}: ${dir}${exists ? '' : ' [NOT FOUND]'}`);
  }
}

export function globalInfoController(argv) {
  const name = argv.name || 'default';

  if (name === '*' || name === 'all') {
    globalListController(argv);
    return;
  }

  const dir = getGlobal(name);
  if (!dir) {
    console.warn(`Global env "${name}" not found in ${GLOBAL_ENV_DIR}`);
    console.warn(`Run: qelos global set ${name === 'default' ? '' : name}`);
    process.exit(1);
  }

  const exists = existsSync(dir);
  console.log(`Global env: ${name}`);
  console.log(`Path:       ${dir}`);
  console.log(`Exists:     ${exists ? 'yes' : 'NO (directory not found)'}`);

  if (exists) {
    const envFiles = getEnvFiles(argv.env);
    const found = envFiles.filter(f => existsSync(join(dir, f)));
    console.log(`Env files:  ${found.length ? found.join(', ') : '(none found)'}`);
  }
}
