import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const GLOBAL_ENV_DIR = join(homedir(), '.qelos-env');
const GLOBAL_ENV_FILE = join(GLOBAL_ENV_DIR, 'globals.json');

let _activeGlobalDir = null;

/**
 * Ensures the ~/.qelos-env directory exists.
 */
function ensureDir() {
  if (!existsSync(GLOBAL_ENV_DIR)) {
    mkdirSync(GLOBAL_ENV_DIR, { recursive: true });
  }
}

/**
 * Reads the global env registry file.
 * @returns {Record<string, string>}
 */
export function readGlobalEnvFile() {
  if (!existsSync(GLOBAL_ENV_FILE)) return {};
  try {
    return JSON.parse(readFileSync(GLOBAL_ENV_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Writes the global env registry file.
 * @param {Record<string, string>} data
 */
export function writeGlobalEnvFile(data) {
  ensureDir();
  writeFileSync(GLOBAL_ENV_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Registers a directory path under a named global env entry.
 * @param {string} name
 * @param {string} dir
 */
export function setGlobal(name, dir) {
  const data = readGlobalEnvFile();
  data[name] = dir;
  writeGlobalEnvFile(data);
}

/**
 * Removes a named global env entry.
 * @param {string} name
 * @returns {boolean} true if the entry existed and was removed
 */
export function deleteGlobal(name) {
  const data = readGlobalEnvFile();
  if (!(name in data)) return false;
  delete data[name];
  writeGlobalEnvFile(data);
  return true;
}

/**
 * Returns the registered directory path for a named global env.
 * @param {string} name
 * @returns {string | null}
 */
export function getGlobal(name) {
  const data = readGlobalEnvFile();
  return data[name] ?? null;
}

/**
 * Sets the active global directory for the current CLI session.
 * Called by the global middleware when --global is used.
 * @param {string | null} dir
 */
export function setActiveGlobalDir(dir) {
  _activeGlobalDir = dir;
}

/**
 * Returns the active global directory for the current CLI session, or null.
 * @returns {string | null}
 */
export function getActiveGlobalDir() {
  return _activeGlobalDir;
}

export { GLOBAL_ENV_DIR, GLOBAL_ENV_FILE };
