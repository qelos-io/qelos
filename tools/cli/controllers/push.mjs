import { initializeSdk } from '../services/sdk.mjs';
import { pushComponents } from '../services/components.mjs';
import { pushBlueprints } from '../services/blueprints.mjs';
import { pushConfigurations } from '../services/configurations.mjs';
import { pushPlugins } from '../services/plugins.mjs';
import { pushBlocks } from '../services/blocks.mjs';
import { logger } from '../services/logger.mjs';
import fs from 'node:fs';
import path from 'node:path';

export default async function pushController({ type, path: sourcePath }) {
  try {
    // Validate path exists
    if (!fs.existsSync(sourcePath)) {
      logger.error(`Path does not exist: ${sourcePath}`);
      logger.info('Please provide a valid directory path');
      process.exit(1);
    }

    const stat = fs.statSync(sourcePath);
    let basePath = sourcePath;
    let targetFile = null;

    if (stat.isFile()) {
      basePath = path.dirname(sourcePath);
      targetFile = path.basename(sourcePath);
      logger.info(`Detected file path. Only pushing ${targetFile}`);
    } else if (!stat.isDirectory()) {
      logger.error(`Path must be a file or directory: ${sourcePath}`);
      process.exit(1);
    }

    const sdk = await initializeSdk();

    // Handle "all" or "*" type
    if (type === 'all' || type === '*') {
      if (targetFile) {
        logger.error('Cannot push "all" using a single file. Please provide a directory path.');
        process.exit(1);
      }
      logger.section(`Pushing all resources from ${sourcePath}`);
      
      const types = [
        { name: 'components', fn: pushComponents },
        { name: 'blueprints', fn: pushBlueprints },
        { name: 'configs', fn: pushConfigurations },
        { name: 'plugins', fn: pushPlugins },
        { name: 'blocks', fn: pushBlocks }
      ];

      for (const { name, fn } of types) {
        const typePath = path.join(basePath, name);
        
        // Skip if directory doesn't exist
        if (!fs.existsSync(typePath)) {
          logger.info(`Skipping ${name} (directory not found: ${typePath})`);
          continue;
        }
        
        logger.section(`Pushing ${name} from ${typePath}`);
        try {
          await fn(sdk, typePath);
          logger.success(`Successfully pushed ${name}`);
        } catch (error) {
          logger.error(`Failed to push ${name}`, error);
        }
      }

      logger.success(`Successfully pushed all resources from ${sourcePath}`);
      return;
    }

    logger.section(`Pushing ${type} from ${targetFile ? `${basePath} (${targetFile})` : basePath}`);

    if (type === 'components') {
      await pushComponents(sdk, basePath, { targetFile });
    } else if (type === 'blueprints') {
      await pushBlueprints(sdk, basePath, { targetFile });
    } else if (type === 'plugins') {
      await pushPlugins(sdk, basePath, { targetFile });
    } else if (type === 'blocks') {
      await pushBlocks(sdk, basePath, { targetFile });
    }  else if (type === 'config' || type === 'configs' || type === 'configuration') {
      await pushConfigurations(sdk, basePath, { targetFile });
    } else {
      logger.error(`Unknown type: ${type}`);
      logger.info('Supported types: components, blueprints, plugins, blocks, config, configs, configuration, all');
      process.exit(1);
    }

    logger.success(`Successfully pushed ${type}`);

  } catch (error) {
    // Don't log the error again if it's already been logged by the service
    if (!error.message?.includes('Failed to push')) {
      logger.error(`Failed to push ${type}`, error);
    }
    
    if (process.env.VERBOSE) {
      console.error('\nStack trace:');
      console.error(error.stack);
    } else {
      console.error('\nRun with VERBOSE=true for full stack trace');
    }
    
    process.exit(1);
  }
}