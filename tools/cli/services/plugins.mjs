import fs from 'node:fs';
import path from 'node:path';
import { join } from 'node:path';
import { logger } from './logger.mjs';
import { extractMicroFrontendStructures, resolveMicroFrontendStructures } from './micro-frontends.mjs';
import { removeIdFromObject } from '../utils/object-utils.mjs';

function sanitizePluginForFile(plugin) {
  const sanitized = JSON.parse(JSON.stringify(plugin));
  
  // Remove _id from internal objects in arrays
  if (Array.isArray(sanitized.subscribedEvents)) {
    sanitized.subscribedEvents.forEach(item => {
      if (item._id) delete item._id;
    });
  }
  
  if (Array.isArray(sanitized.microFrontends)) {
    sanitized.microFrontends.forEach(mfe => {
      if (mfe._id) delete mfe._id;
      if (Array.isArray(mfe.requires)) {
        mfe.requires.forEach(item => {
          if (item._id) delete item._id;
        });
      }
    });
  }
  
  if (Array.isArray(sanitized.injectables)) {
    sanitized.injectables.forEach(item => {
      if (item._id) delete item._id;
    });
  }
  
  if (Array.isArray(sanitized.navBarGroups)) {
    sanitized.navBarGroups.forEach(item => {
      if (item._id) delete item._id;
    });
  }
  
  if (Array.isArray(sanitized.cruds)) {
    sanitized.cruds.forEach(item => {
      if (item._id) delete item._id;
    });
  }
  
  return sanitized;
}

/**
 * Push plugins from local directory to remote
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} path - Path to plugins directory
 */
export async function pushPlugins(sdk, path, options = {}) {
  const { targetFile } = options;
  const directoryFiles = fs.readdirSync(path);
  const files = targetFile ? [targetFile] : directoryFiles;
  const pluginFiles = files.filter(f => f.endsWith('.plugin.json'));
  
  if (pluginFiles.length === 0) {
    if (targetFile) {
      logger.warning(`File ${targetFile} is not a .plugin.json file. Skipping.`);
    } else {
      logger.warning(`No plugin files (*.plugin.json) found in ${path}`);
    }
    return;
  }
  
  logger.info(`Found ${pluginFiles.length} plugin(s) to push`);
  const existingPlugins = await sdk.managePlugins.getList();
  
  const results = await Promise.allSettled(pluginFiles.map(async (file) => {
    if (file.endsWith('.plugin.json')) {
      let pluginData;
      try {
        pluginData = JSON.parse(fs.readFileSync(join(path, file), 'utf-8'));
      } catch (error) {
        logger.error(`Failed to parse ${file}`, error);
        throw new Error(`Parse error in ${file}: ${error.message}`);
      }
      
      const apiPath = pluginData.apiPath;
      
      if (!apiPath) {
        logger.warning(`Skipping ${file}: missing apiPath field`);
        return { skipped: true, file };
      }
      
      logger.step(`Pushing plugin: ${apiPath}`);
      
      // Resolve micro-frontend structures from $ref references
      if (pluginData.microFrontends && pluginData.microFrontends.length > 0) {
        try {
          pluginData.microFrontends = await resolveMicroFrontendStructures(
            pluginData.microFrontends,
            path
          );
        } catch (error) {
          logger.error(`Failed to resolve micro-frontend structures for ${apiPath}`, error);
          throw new Error(`Failed to resolve structures for ${apiPath}: ${error.message}`);
        }
      }
      
      const existingPlugin = existingPlugins.find(
        plugin => plugin.apiPath === apiPath
      );
      
      try {
        if (existingPlugin) {
          await sdk.managePlugins.update(existingPlugin._id, pluginData);
          logger.success(`Updated: ${apiPath}`);
        } else {
          await sdk.managePlugins.create(pluginData);
          logger.success(`Created: ${apiPath}`);
        }
        return { success: true, apiPath };
      } catch (error) {
        // Extract detailed error information
        let errorMessage = error.message || 'Unknown error';
        let errorDetails = null;
        
        // The SDK throws the response body as the error
        if (typeof error === 'object' && error !== null) {
          if (error.message) {
            errorMessage = error.message;
          }
          if (error.error) {
            errorDetails = error.error;
          }
          if (error.errors) {
            errorDetails = error.errors;
          }
        }
        
        logger.error(`Failed to push ${apiPath}: ${errorMessage}`);
        
        if (errorDetails) {
          if (typeof errorDetails === 'string') {
            logger.error(`  Details: ${errorDetails}`);
          } else {
            logger.error(`  Details: ${JSON.stringify(errorDetails, null, 2)}`);
          }
        }
        
        if (process.env.VERBOSE && error.stack) {
          logger.debug(`Stack: ${error.stack}`);
        }
        
        throw new Error(`Failed to push ${apiPath}: ${errorMessage}`);
      }
    }
  }));
  
  // Check for failures
  const failures = results.filter(r => r.status === 'rejected');
  
  if (failures.length > 0) {
    logger.error(`\n${failures.length} plugin(s) failed to push:`);
    failures.forEach(f => {
      logger.error(`  • ${f.reason.message}`);
    });
    throw new Error(`Failed to push ${failures.length} plugin(s)`);
  }
  
  logger.info(`Pushed ${pluginFiles.length} plugin(s)`);
}

/**
 * Pull plugins from remote to local directory
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} targetPath - Path to save plugins
 */
export async function pullPlugins(sdk, targetPath) {
  // Create directory if it doesn't exist
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
    logger.info(`Created directory: ${targetPath}`);
  }

  const plugins = await sdk.managePlugins.getList();
  
  if (plugins.length === 0) {
    logger.warning('No plugins found to pull');
    return;
  }
  
  logger.info(`Found ${plugins.length} plugin(s) to pull`);

  await Promise.all(plugins.map(async (plugin) => {
    const fileName = `${plugin.apiPath}.plugin.json`;
    const filePath = join(targetPath, fileName);
    const pluginDir = join(targetPath, plugin.apiPath);

    // Fetch full plugin details
    const fullPlugin = await sdk.managePlugins.getById(plugin._id);

    // Extract micro-frontend structures to separate files
    const processedMicroFrontends = extractMicroFrontendStructures(
      (fullPlugin.microFrontends || []).map(removeIdFromObject),
      targetPath
    );

    const relevantFields = {
      name: fullPlugin.name,
      description: fullPlugin.description,
      manifestUrl: fullPlugin.manifestUrl,
      callbackUrl: fullPlugin.callbackUrl,
      registerUrl: fullPlugin.registerUrl,
      apiPath: fullPlugin.apiPath,
      authAcquire: fullPlugin.authAcquire,
      proxyUrl: fullPlugin.proxyUrl,
      subscribedEvents: (fullPlugin.subscribedEvents || []).map(removeIdFromObject),
      microFrontends: processedMicroFrontends,
      injectables: (fullPlugin.injectables || []).map(removeIdFromObject),
      navBarGroups: (fullPlugin.navBarGroups || []).map(removeIdFromObject),
      cruds: (fullPlugin.cruds || []).map(removeIdFromObject),
    }
    
    // Sanitize the plugin to remove any remaining _id fields from internal objects
    const sanitizedPlugin = sanitizePluginForFile(relevantFields);
    
    fs.writeFileSync(filePath, JSON.stringify(sanitizedPlugin, null, 2), 'utf-8');
    logger.step(`Pulled: ${plugin.apiPath}`);
  }));

  logger.info(`Pulled ${plugins.length} plugin(s)`);
}
