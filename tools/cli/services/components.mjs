import fs from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.mjs';

/**
 * Push components from local directory to remote
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} path - Path to components directory
 */
export async function pushComponents(sdk, path, options = {}) {
  const { targetFile } = options;
  const directoryFiles = fs.readdirSync(path);
  const files = targetFile ? [targetFile] : directoryFiles;
  const vueFiles = files.filter(f => f.endsWith('.vue'));
  
  if (vueFiles.length === 0) {
    if (targetFile) {
      logger.warning(`File ${targetFile} is not a .vue component. Skipping.`);
    } else {
      logger.warning(`No .vue files found in ${path}`);
    }
    return;
  }
  
  logger.info(`Found ${vueFiles.length} component(s) to push`);
  let componentsJson = {};
  
  try {
    const jsonPath = join(path, 'components.json');
    if (fs.existsSync(jsonPath)) {
      componentsJson = JSON.parse(fs.readFileSync(jsonPath));
    }
  } catch (error) {
    logger.debug('No components.json found or invalid format');
  }
  
  const existingComponents = await sdk.components.getList();
  
  await Promise.all(vueFiles.map(async (file) => {
    if (file.endsWith('.vue')) {
      const componentName = file.replace('.vue', '');
      const info = componentsJson[componentName] || {};
      const content = fs.readFileSync(join(path, file), 'utf-8');
      const targetIdentifier = info.identifier || componentName;
      const targetDescription = info.description || 'Component description';
      
      logger.step(`Pushing component: ${componentName}`);
      
      const existingComponent = existingComponents.find(
        component => component.identifier === targetIdentifier || component.componentName === componentName
      );
      
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
    const fileName = `${component.componentName}.vue`;
    const filePath = join(targetPath, fileName);

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

  fs.writeFileSync(
    join(targetPath, 'components.json'),
    JSON.stringify(
      componentsInformation.reduce((obj, current) => {
        obj[current.componentName] = current;
        return obj;
      }, {}),
      null,
      2
    )
  );

  logger.info(`Saved components.json with metadata`);
  logger.info(`Pulled ${components.length} component(s)`);
}
