import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));

/** Subpaths that are part of the public API and ship as ESM + CommonJS builds (not the raw `src` / `package.json` ones). */
export const buildExports: Array<[string, any]> = Object.entries(manifest.exports).filter(
  ([key]) => key !== './package.json' && !key.startsWith('./src'),
) as Array<[string, any]>;

/** Subpaths without a wildcard, safe to import by name. */
export const namedSubpaths = buildExports.map(([key]) => key).filter((key) => !key.includes('*') && key !== './dist');
