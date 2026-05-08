import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { generateTsDeclarations } from '../services/interfaces/generate-ts.mjs';
import { generatePyDeclarations } from '../services/interfaces/generate-py.mjs';
import { findTsconfig, injectIntoTsconfig } from '../services/interfaces/tsconfig-inject.mjs';
import { logger } from '../services/utils/logger.mjs';

const TS_OUTPUT_FILE = 'qelos-blueprints.d.ts';
const PY_OUTPUT_FILE = 'qelos_blueprints.py';

function resolvePath(value, cwd = process.cwd()) {
  if (!value) return null;
  return isAbsolute(value) ? value : resolve(cwd, value);
}

function loadBlueprintsFromDir(sourceDir) {
  const entries = readdirSync(sourceDir);
  const blueprintFiles = entries.filter((file) => file.endsWith('.blueprint.json'));
  const blueprints = [];

  for (const file of blueprintFiles) {
    const filePath = join(sourceDir, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && parsed.identifier) {
        blueprints.push(parsed);
      } else {
        logger.warning(`Skipping ${file}: missing identifier`);
      }
    } catch (error) {
      logger.warning(`Skipping ${file}: ${error.message}`);
    }
  }

  return blueprints;
}

export default async function interfacesBuildController(argv) {
  const cwd = process.cwd();
  const lang = argv.lang || 'ts';
  const sourceDir = resolvePath(argv.path || './blueprints', cwd);
  const outDir = resolvePath(argv.out || './types', cwd);

  if (!existsSync(sourceDir)) {
    logger.error(`Blueprints folder not found: ${sourceDir}`);
    logger.info('Run `qelos pull blueprints` first to fetch blueprints from your Qelos instance.');
    process.exit(1);
  }

  const blueprints = loadBlueprintsFromDir(sourceDir);

  if (blueprints.length === 0) {
    logger.warning(`No blueprint files (*.blueprint.json) found in ${sourceDir}`);
  } else {
    logger.info(`Loaded ${blueprints.length} blueprint(s) from ${sourceDir}`);
  }

  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
    logger.info(`Created output directory: ${outDir}`);
  }

  if (lang === 'py' || lang === 'python') {
    const output = generatePyDeclarations(blueprints);
    const outFile = join(outDir, PY_OUTPUT_FILE);
    writeFileSync(outFile, output, 'utf-8');
    logger.success(`Generated Python types: ${outFile}`);
    return;
  }

  if (lang !== 'ts' && lang !== 'typescript') {
    logger.error(`Unsupported lang: ${lang}`);
    logger.info('Supported languages: ts, py');
    process.exit(1);
  }

  const output = generateTsDeclarations(blueprints);
  const outFile = join(outDir, TS_OUTPUT_FILE);
  writeFileSync(outFile, output, 'utf-8');
  logger.success(`Generated TypeScript declarations: ${outFile}`);

  const tsconfigPath = findTsconfig(cwd);
  if (!tsconfigPath) {
    logger.warning('No tsconfig.json found in current directory — skipping include injection.');
    logger.info(`To use the generated types, add ${outFile} to your tsconfig include manually.`);
    return;
  }

  try {
    const result = injectIntoTsconfig({ tsconfigPath, generatedFilePath: outFile });
    if (result.updated) {
      logger.success(`Updated tsconfig.json include with: ${result.entry}`);
    } else {
      logger.info(`tsconfig.json already includes ${result.entry} — no change needed.`);
    }
  } catch (error) {
    logger.error('Failed to update tsconfig.json', error);
  }
}
