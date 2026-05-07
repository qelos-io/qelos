import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, chmodSync } from 'node:fs';

const CREDENTIALS_DIR = join(homedir(), '.qelos');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

function ensureDir() {
  if (!existsSync(CREDENTIALS_DIR)) {
    mkdirSync(CREDENTIALS_DIR, { recursive: true });
  }
}

/**
 * Reads stored credentials. Returns null if missing or invalid.
 * @returns {{ appUrl?: string, apiToken?: string, user?: object, createdAt?: string } | null}
 */
export function readCredentials() {
  if (!existsSync(CREDENTIALS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Persists credentials to ~/.qelos/credentials.json with 0600 permissions where supported.
 * @param {{ appUrl?: string, apiToken?: string, user?: object, createdAt?: string }} creds
 */
export function saveCredentials(creds) {
  ensureDir();
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2) + '\n', 'utf-8');
  try {
    chmodSync(CREDENTIALS_FILE, 0o600);
  } catch {
    // chmod is best-effort (no-op on Windows)
  }
}

/**
 * Removes the credentials file. Returns true if a file was removed.
 * @returns {boolean}
 */
export function clearCredentials() {
  if (!existsSync(CREDENTIALS_FILE)) return false;
  unlinkSync(CREDENTIALS_FILE);
  return true;
}

/**
 * Returns a masked representation of a token: first 4 + '...' + last 4 chars.
 * @param {string} token
 * @returns {string}
 */
export function maskToken(token) {
  if (!token) return '';
  if (token.length <= 12) return '*'.repeat(token.length);
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export { CREDENTIALS_DIR, CREDENTIALS_FILE };
