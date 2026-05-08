import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';

/**
 * Strips // line and /* block *\/ comments and trailing commas from JSON-with-comments
 * source. Tolerates strings containing comment-like sequences.
 * @param {string} source
 * @returns {string} parseable JSON
 */
export function stripJsonComments(source) {
  let out = '';
  let i = 0;
  let inString = false;
  let escape = false;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (inString) {
      out += ch;
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      i += 1;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * Parses a tsconfig.json that may contain comments and/or trailing commas.
 * @param {string} source
 * @returns {object}
 */
export function parseTsconfig(source) {
  return JSON.parse(stripJsonComments(source));
}

/**
 * Normalizes an include entry to a forward-slash, relative form so comparisons
 * across platforms are stable.
 * @param {string} value
 * @returns {string}
 */
function normalizeIncludeEntry(value) {
  return String(value).replace(/\\/g, '/');
}

/**
 * Builds the include path for a generated file relative to the tsconfig directory.
 * @param {string} tsconfigDir
 * @param {string} generatedFilePath - absolute path to the generated declaration file
 * @returns {string}
 */
export function toIncludeEntry(tsconfigDir, generatedFilePath) {
  const absolute = isAbsolute(generatedFilePath)
    ? generatedFilePath
    : join(tsconfigDir, generatedFilePath);
  const rel = relative(tsconfigDir, absolute);
  const normalized = rel.split(sep).join('/');
  return normalized.startsWith('.') || normalized.startsWith('/')
    ? normalized
    : `./${normalized}`;
}

/**
 * Locates a tsconfig.json file in the given directory.
 * @param {string} cwd
 * @returns {string | null}
 */
export function findTsconfig(cwd) {
  const candidate = join(cwd, 'tsconfig.json');
  return existsSync(candidate) ? candidate : null;
}

/**
 * Idempotently adds the generated declaration file path to a tsconfig.json's
 * `include` array. Preserves existing include entries.
 *
 * Rewrites the file as plain JSON (no comments) only when a change is required;
 * if the entry is already present, the file is left untouched.
 *
 * @param {object} options
 * @param {string} options.tsconfigPath - absolute path to tsconfig.json
 * @param {string} options.generatedFilePath - absolute path to the generated .d.ts file
 * @returns {{ updated: boolean, entry: string, includes: string[] }}
 */
export function injectIntoTsconfig({ tsconfigPath, generatedFilePath }) {
  const source = readFileSync(tsconfigPath, 'utf-8');
  const parsed = parseTsconfig(source);
  const tsconfigDir = tsconfigPath.replace(/[\\/]tsconfig\.json$/, '');
  const entry = toIncludeEntry(tsconfigDir, generatedFilePath);

  const existing = Array.isArray(parsed.include) ? parsed.include.slice() : [];
  const alreadyPresent = existing.some(
    (item) => normalizeIncludeEntry(item) === normalizeIncludeEntry(entry)
  );

  if (alreadyPresent) {
    return { updated: false, entry, includes: existing };
  }

  const nextIncludes = [...existing, entry];
  const nextConfig = { ...parsed, include: nextIncludes };

  writeFileSync(tsconfigPath, JSON.stringify(nextConfig, null, 2) + '\n', 'utf-8');
  return { updated: true, entry, includes: nextIncludes };
}
