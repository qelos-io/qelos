import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
export const consumerScript = join(packageRoot, 'test', 'packaging', 'fixtures', 'dom-consumer.mjs');
