import fs from 'node:fs';
import path, { join } from 'node:path';
import { logger } from './logger.mjs';

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
 * Push components from local directory to remote
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
  
  const existingComponents = await sdk.components.getList();
  
  await Promise.all(vueFiles.map(async (file) => {
    if (file.endsWith('.vue')) {
      const relativePath = normalizeRelativeIdentifier(path.relative(componentsPath, file));
      const componentName = relativePath.split('/').pop().replace('.vue', '');
      const info = componentsJson[componentName] || {};
      const content = fs.readFileSync(file, 'utf-8');
      const targetIdentifier = normalizeRelativeIdentifier(info.identifier || relativePath.replace('.vue', ''));
      const targetDescription = info.description || 'Component description';

      if (!isSafeRelativeIdentifier(targetIdentifier)) {
        logger.error(`Skipping component with unsafe identifier: ${targetIdentifier}`);
        return;
      }
      
      logger.step(`Pushing component: ${componentName}`);
      
      const existingComponent = existingComponents.find(
        component => component.identifier === targetIdentifier || component.componentName === componentName
      );
      
      try {
        if (existingComponent) {
          await sdk.components.update(existingComponent._id, {
            identifier: targetIdentifier,
            componentName: componentName,
            content,
            description: info.description || existingComponent.description || 'Component description'
          });
          logger.success(`Updated: ${componentName}`);
        } else {
          await sdk.components.create({
            identifier: targetIdentifier,
            componentName: componentName,
            content,
            description: targetDescription
          });
          logger.success(`Created: ${componentName}`);
        }
      } catch (error) {
        // Extract reason from error details if available
        const reason = error.details?.reason || error.message;
        logger.error(`Failed to push component: ${componentName} - ${reason}`);
        throw error;
      }
    }
  }));
  
  logger.info(`Pushed ${vueFiles.length} component(s)`);
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
