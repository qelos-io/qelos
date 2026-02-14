import fs from 'node:fs';
import path from 'node:path';
import { red, yellow } from '../utils/colors.mjs';
import { logger } from './logger.mjs';
import { confirmDialog } from './interactive-select.mjs';

/**
 * Get local files from directory
 */
export function getLocalFiles(typePath, type) {
  if (!fs.existsSync(typePath)) return [];
  
  const files = fs.readdirSync(typePath);
  return files.filter(file => {
    if (type === 'components') return file.endsWith('.vue');
    if (type === 'blueprints') return file.endsWith('.blueprint.json');
    if (type === 'plugins') return file.endsWith('.plugin.json');
    if (type === 'integrations') return file.endsWith('.integration.json');
    return false;
  });
}

/**
 * Get remote resources from Qelos
 */
export async function getRemoteResources(sdk, type) {
  try {
    switch (type) {
      case 'components':
        return await sdk.components.getList();
      case 'blueprints':
        return await sdk.manageBlueprints.getList();
      case 'plugins':
        return await sdk.managePlugins.getList();
      case 'integrations':
        return await sdk.integrations.getList();
      default:
        return [];
    }
  } catch (error) {
    logger.error(`Failed to fetch remote ${type}:`, error);
    return [];
  }
}

/**
 * Extract identifier from filename
 */
export function getIdentifierFromFile(filename, type) {
  if (type === 'components') {
    return filename.replace('.vue', '');
  }
  if (type === 'blueprints') {
    return filename.replace('.blueprint.json', '');
  }
  if (type === 'plugins') {
    return filename.replace('.plugin.json', '');
  }
  if (type === 'integrations') {
    return filename.replace('.integration.json', '');
  }
  return filename;
}

/**
 * Show warning and get confirmation for hard push
 */
export async function confirmHardPush(toRemove) {
  console.log(yellow('\n⚠️  WARNING: You are using the --hard flag'));
  console.log(yellow('This will permanently remove resources from Qelos that don\'t exist locally.\n'));
  
  console.log(red('The following resources will be removed:'));
  toRemove.forEach(({ type, identifier }) => {
    console.log(red(`  - ${type}: ${identifier}`));
  });
  
  const message = '\nDo you want to continue?';
  return await confirmDialog(message, false, { 
    noLabel: 'No (default)', 
    yesLabel: 'Yes, remove them' 
  });
}

/**
 * Remove resources from Qelos
 */
export async function removeResources(sdk, toRemove) {
  for (const { type, identifier } of toRemove) {
    try {
      switch (type) {
        case 'components':
          // For components, we need to find the component by identifier first
          const components = await sdk.components.getList();
          const component = components.find(c => c.identifier === identifier);
          if (component) {
            await sdk.components.remove(component._id);
          }
          break;
        case 'blueprints':
          await sdk.manageBlueprints.remove(identifier);
          break;
        case 'plugins':
          // For plugins, we need to find the plugin by key first
          const plugins = await sdk.managePlugins.getList();
          const plugin = plugins.find(p => p.key === identifier);
          if (plugin) {
            await sdk.managePlugins.remove(plugin._id);
          }
          break;
        case 'integrations':
          // For integrations, we need to find the integration by identifier first
          const integrations = await sdk.integrations.getList();
          const integration = integrations.find(i => i.identifier === identifier);
          if (integration) {
            await sdk.integrations.remove(integration._id);
          }
          break;
      }
      logger.info(`Removed ${type}: ${identifier}`);
    } catch (error) {
      logger.error(`Failed to remove ${type}: ${identifier}`, error);
    }
  }
}
