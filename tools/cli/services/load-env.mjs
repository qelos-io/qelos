import dotenv from 'dotenv';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Returns the ordered list of .env files to attempt loading.
 * @param {string} [envSuffix] - Optional env suffix (e.g. "production")
 * @returns {string[]}
 */
export function getEnvFiles(envSuffix) {
  return [
    ...(envSuffix ? [`.env.${envSuffix}.local`, `.env.${envSuffix}`] : []),
    '.env.local',
    '.env'
  ];
}

/**
 * Loads .env files from the given directory into process.env.
 * @param {object} options
 * @param {string} [options.envSuffix] - Optional env suffix (e.g. "production")
 * @param {string} [options.cwd] - Directory to resolve .env files from (defaults to process.cwd())
 * @param {boolean} [options.verbose] - Log loaded files to console
 * @returns {string[]} List of env files that were loaded
 */
export function loadEnv({ envSuffix, cwd, verbose } = {}) {
  const dir = cwd || process.cwd();
  const envFiles = getEnvFiles(envSuffix);
  const loaded = [];

  for (const envFile of envFiles) {
    const envPath = join(dir, envFile);
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, silent: true });
      if (verbose) console.log(`Loaded env file: ${envFile}`);
      loaded.push(envFile);
    }
  }

  return loaded;
}
