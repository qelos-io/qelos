import fs from 'node:fs';
import path, { join } from 'node:path';
import { logger } from '../utils/logger.mjs';

function normalizeRelativeIdentifier(value) {
  return String(value || '')
    .replaceAll('\\', '/')
    .replace(/^\//, '')
    .trim();
}

function isSafeRelativeIdentifier(value) {
  if (!value) return false;
  if (value.includes('..')) return false;
  if (value.startsWith('/')) return false;
  return true;
}

const SCRIPT_EXT_REGEX = /\.(m?[jt]sx?)$/;
const DECLARATION_REGEX = /\.d\.[mc]?ts$/;

/** js/ts modules (not declaration files) that are published as scripts next to the components */
export function isScriptFile(fileName) {
  return SCRIPT_EXT_REGEX.test(fileName) && !DECLARATION_REGEX.test(fileName);
}

/** `.vue` components and js/ts scripts, the two kinds published from the components folder */
export function isPublishableFile(fileName) {
  return fileName.endsWith('.vue') || isScriptFile(fileName);
}

/** `utils/demo.ts` -> `utils/demo` (the server resolves `./utils/demo.ts` imports to this identifier) */
export function identifierFromFile(relativePath) {
  return normalizeRelativeIdentifier(relativePath).replace(/\.vue$/, '').replace(SCRIPT_EXT_REGEX, '');
}

function listVueFilesRecursively(rootDir, currentDir = rootDir, out = []) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      listVueFilesRecursively(rootDir, fullPath, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!isPublishableFile(entry.name)) continue;
    out.push(fullPath);
  }
  return out;
}

/**
 * Push components from local directory to remote.
 * Uses bulk endpoint when pushing multiple files to avoid crashing the server.
 * Falls back to individual requests for single file pushes.
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} path - Path to components directory
 */
export async function pushComponents(sdk, componentsPath, options = {}) {
  const { targetFile } = options;
  const filePaths = targetFile
    ? [join(componentsPath, targetFile)]
    : listVueFilesRecursively(componentsPath);
  const files = filePaths
    .filter(filePath => fs.existsSync(filePath))
    .filter(filePath => isPublishableFile(filePath));

  if (files.length === 0) {
    if (targetFile) {
      logger.warning(`File ${targetFile} is not a .vue component or a .js/.ts script. Skipping.`);
    } else {
      logger.warning(`No .vue, .js or .ts files found in ${componentsPath}`);
    }
    return;
  }

  logger.info(`Found ${files.length} file(s) to push`);
  let componentsJson = {};

  try {
    const jsonPath = join(componentsPath, 'components.json');
    if (fs.existsSync(jsonPath)) {
      componentsJson = JSON.parse(fs.readFileSync(jsonPath));
    }
  } catch (error) {
    logger.debug('No components.json found or invalid format');
  }

  // Build the payload: .vue files are components, .js/.ts files are scripts
  const payload = [];
  for (const file of files) {
    const relativePath = normalizeRelativeIdentifier(path.relative(componentsPath, file));
    const content = fs.readFileSync(file, 'utf-8');

    if (isScriptFile(file)) {
      const identifier = identifierFromFile(relativePath);
      if (!isSafeRelativeIdentifier(identifier)) {
        logger.error(`Skipping script with unsafe identifier: ${identifier}`);
        continue;
      }
      payload.push({ type: 'script', identifier, content, description: componentsJson[identifier]?.description });
      continue;
    }

    const componentName = relativePath.split('/').pop().replace('.vue', '');
    const info = componentsJson[componentName] || {};
    const targetIdentifier = normalizeRelativeIdentifier(info.identifier || relativePath.replace('.vue', ''));
    if (!isSafeRelativeIdentifier(targetIdentifier)) {
      logger.error(`Skipping component with unsafe identifier: ${targetIdentifier}`);
      continue;
    }
    payload.push({
      type: 'component',
      identifier: targetIdentifier,
      componentName,
      content,
      description: info.description || 'Component description',
    });
  }

  if (payload.length === 0) {
    logger.warning('No valid files to push');
    return;
  }

  const scriptsCount = payload.filter(item => item.type === 'script').length;

  // Unified API: accepts components and scripts together, and processes scripts first so components can import them
  if (sdk.scripts?.bulkCreateOrUpdate) {
    logger.info(`Pushing ${payload.length} file(s) (${payload.length - scriptsCount} component(s), ${scriptsCount} script(s))...`);
    const response = await sdk.scripts.bulkCreateOrUpdate(payload);
    for (const result of response.results) {
      if (result.success) {
        logger.success(`Pushed: ${result.identifier}`);
      } else {
        logger.error(`Failed: ${result.identifier} - ${result.error}`);
      }
    }
    logger.info(`Push complete: ${response.succeeded} succeeded, ${response.failed} failed out of ${response.total}`);
    if (response.failed > 0) {
      throw new Error(`Failed to push ${response.failed} file(s)`);
    }
    return;
  }

  // Older @qelos/sdk: only components are supported
  if (scriptsCount > 0) {
    logger.warning(`The installed @qelos/sdk does not support scripts. Skipping ${scriptsCount} .js/.ts file(s), please update @qelos/sdk.`);
  }
  const componentsPayload = payload.filter(item => item.type === 'component');
  if (componentsPayload.length === 0) return;

  // Use bulk endpoint when pushing multiple components
  if (componentsPayload.length > 1 && sdk.components.bulkCreateOrUpdate) {
    logger.info(`Using bulk push for ${componentsPayload.length} components...`);
    try {
      const response = await sdk.components.bulkCreateOrUpdate(componentsPayload);
      for (const result of response.results) {
        if (result.success) {
          logger.success(`Pushed: ${result.identifier}`);
        } else {
          logger.error(`Failed: ${result.identifier} - ${result.error}`);
        }
      }
      logger.info(`Bulk push complete: ${response.succeeded} succeeded, ${response.failed} failed out of ${response.total}`);
      if (response.failed > 0) {
        throw new Error(`Failed to push ${response.failed} component(s)`);
      }
    } catch (error) {
      if (error.message?.includes('Failed to push')) {
        throw error;
      }
      // If bulk endpoint is not available, fall back to individual pushes
      logger.warning('Bulk push failed, falling back to individual pushes...');
      await pushComponentsIndividually(sdk, componentsPath, componentsPayload, componentsJson);
    }
  } else {
    await pushComponentsIndividually(sdk, componentsPath, componentsPayload, componentsJson);
  }

  logger.info(`Pushed ${componentsPayload.length} component(s)`);
}

async function pushComponentsIndividually(sdk, componentsPath, componentsPayload, componentsJson) {
  const existingComponents = await sdk.components.getList();

  for (const comp of componentsPayload) {
    logger.step(`Pushing component: ${comp.componentName}`);

    const existingComponent = existingComponents.find(
      component => component.identifier === comp.identifier || component.componentName === comp.componentName
    );

    try {
      if (existingComponent) {
        await sdk.components.update(existingComponent._id, {
          identifier: comp.identifier,
          componentName: comp.componentName,
          content: comp.content,
          description: comp.description || existingComponent.description || 'Component description'
        });
        logger.success(`Updated: ${comp.componentName}`);
      } else {
        await sdk.components.create({
          identifier: comp.identifier,
          componentName: comp.componentName,
          content: comp.content,
          description: comp.description
        });
        logger.success(`Created: ${comp.componentName}`);
      }
    } catch (error) {
      const reason = error.details?.reason || error.message;
      logger.error(`Failed to push component: ${comp.componentName} - ${reason}`);
      throw error;
    }
  }
}

/**
 * Pull components from remote to local directory
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} targetPath - Path to save components
 */
export async function pullComponents(sdk, targetPath) {
  // Create directory if it doesn't exist
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
    logger.info(`Created directory: ${targetPath}`);
  }

  // Unified API returns components and scripts; older SDKs only know components
  const unified = Boolean(sdk.scripts?.getList);
  const items = unified
    ? await sdk.scripts.getList()
    : (await sdk.components.getList()).map(component => ({ ...component, type: 'component' }));

  if (items.length === 0) {
    logger.warning('No components found to pull');
    return;
  }

  logger.info(`Found ${items.length} file(s) to pull`);

  const information = await Promise.all(items.map(async (item) => {
    const isScript = item.type === 'script';
    const normalizedIdentifier = normalizeRelativeIdentifier(item.identifier);
    // the original script extension isn't stored, and TS is a superset of JS
    const fileName = `${normalizedIdentifier}${isScript ? '.ts' : '.vue'}`;
    const filePath = join(targetPath, fileName);

    if (!isSafeRelativeIdentifier(normalizedIdentifier)) {
      logger.error(`Skipping pull for unsafe identifier: ${item.identifier}`);
      return null;
    }

    const targetDir = join(targetPath, fileName.split('/').slice(0, -1).join('/'));
    if (targetDir && !fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const { content, description } = unified
      ? await sdk.scripts.getScript(item._id)
      : await sdk.components.getComponent(item._id);

    fs.writeFileSync(filePath, content, 'utf-8');
    logger.step(`Pulled: ${item.identifier}${isScript ? ' (script)' : ''}`);

    return {
      _id: item._id,
      isScript,
      componentName: item.componentName,
      identifier: item.identifier,
      description,
    };
  }));

  const filtered = information.filter(Boolean);

  // components.json is keyed by component name; scripts have no name, so they are keyed by identifier
  fs.writeFileSync(
    join(targetPath, 'components.json'),
    JSON.stringify(
      filtered.reduce((obj, { isScript, ...current }) => {
        obj[isScript ? current.identifier : current.componentName] = current;
        return obj;
      }, {}),
      null,
      2
    )
  );

  logger.info(`Saved components.json with metadata`);
  logger.info(`Pulled ${filtered.length} file(s)`);
}

export { listVueFilesRecursively };
