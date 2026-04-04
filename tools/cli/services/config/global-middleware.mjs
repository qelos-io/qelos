import { existsSync } from 'node:fs';
import { loadEnv } from './load-env.mjs';
import { loadConfig } from './load-config.mjs';
import { getGlobal, setActiveGlobalDir } from './global-env.mjs';

/**
 * Yargs middleware that auto-loads .env files and config before any command handler.
 * Handles --global flag to switch working directory to a registered global environment.
 * @param {object} argv
 */
export function globalMiddleware(argv) {
  let cwd = process.cwd();

  if (argv.global !== undefined) {
    const globalName = argv.global === '' ? 'default' : argv.global;
    const globalDir = getGlobal(globalName);
    if (globalDir && existsSync(globalDir)) {
      cwd = globalDir;
      setActiveGlobalDir(globalDir);
      if (argv.verbose) console.log(`Using global env "${globalName}": ${globalDir}`);
    } else {
      console.warn(`Global env "${globalName}" not found. Run: qelos global set${globalName !== 'default' ? ' ' + globalName : ''}`);
    }
  }

  loadEnv({ envSuffix: argv.env, cwd, verbose: argv.verbose });
  loadConfig({ configPath: argv.config, cwd, verbose: argv.verbose });
}
