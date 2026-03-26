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
    if (!entry.name.endsWith('.vue')) continue;
    if (entry.name === 'components.json') continue;
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
  const vueFilePaths = targetFile
    ? [join(componentsPath, targetFile)]
    : listVueFilesRecursively(componentsPath);
  const vueFiles = vueFilePaths
    .filter(filePath => fs.existsSync(filePath))
    .filter(filePath => filePath.endsWith('.vue'));

  if (vueFiles.length === 0) {
    if (targetFile) {
      logger.warning(`File ${targetFile} is not a .vue component. Skipping.`);
    } else {
      logger.warning(`No .vue files found in ${componentsPath}`);
    }
    return;
  }

  logger.info(`Found ${vueFiles.length} component(s) to push`);
  let componentsJson = {};

  try {
    const jsonPath = join(componentsPath, 'components.json');
    if (fs.existsSync(jsonPath)) {
      componentsJson = JSON.parse(fs.readFileSync(jsonPath));
    }
  } catch (error) {
    logger.debug('No components.json found or invalid format');
  }

  // Build the components payload
  const componentsPayload = [];
  for (const file of vueFiles) {
    const relativePath = normalizeRelativeIdentifier(path.relative(componentsPath, file));
    const componentName = relativePath.split('/').pop().replace('.vue', '');
    const info = componentsJson[componentName] || {};
    const content = fs.readFileSync(file, 'utf-8');
    const targetIdentifier = normalizeRelativeIdentifier(info.identifier || relativePath.replace('.vue', ''));
    const targetDescription = info.description || 'Component description';

    if (!isSafeRelativeIdentifier(targetIdentifier)) {
      logger.error(`Skipping component with unsafe identifier: ${targetIdentifier}`);
      continue;
    }

    componentsPayload.push({
      identifier: targetIdentifier,
      componentName,
      content,
      description: targetDescription,
    });
  }

  if (componentsPayload.length === 0) {
    logger.warning('No valid components to push');
    return;
  }

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

  const components = await sdk.components.getList();
  
  if (components.length === 0) {
    logger.warning('No components found to pull');
    return;
  }
  
  logger.info(`Found ${components.length} component(s) to pull`);

  const componentsInformation = await Promise.all(components.map(async (component) => {
    const normalizedIdentifier = normalizeRelativeIdentifier(component.identifier);
    const fileName = `${normalizedIdentifier}.vue`;
    const filePath = join(targetPath, fileName);

    if (!isSafeRelativeIdentifier(normalizedIdentifier)) {
      logger.error(`Skipping pull for unsafe identifier: ${component.identifier}`);
      return null;
    }

    const targetDir = join(targetPath, fileName.split('/').slice(0, -1).join('/'));
    if (targetDir && !fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const { content, description } = await sdk.components.getComponent(component._id);
    
    fs.writeFileSync(filePath, content, 'utf-8');
    logger.step(`Pulled: ${component.identifier}`);

    return {
      _id: component._id,
      componentName: component.componentName,
      identifier: component.identifier,
      description,
    };
  }));

  const filteredComponentsInformation = componentsInformation.filter(Boolean);

  fs.writeFileSync(
    join(targetPath, 'components.json'),
    JSON.stringify(
      filteredComponentsInformation.reduce((obj, current) => {
        obj[current.componentName] = current;
        return obj;
      }, {}),
      null,
      2
    )
  );

  logger.info(`Saved components.json with metadata`);
  logger.info(`Pulled ${filteredComponentsInformation.length} component(s)`);
}

export { listVueFilesRecursively };
