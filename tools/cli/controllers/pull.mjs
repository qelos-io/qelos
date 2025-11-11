import { initializeSdk } from '../services/sdk.mjs';
import { pullComponents } from '../services/components.mjs';
import { pullBlueprints } from '../services/blueprints.mjs';
import { pullConfigurations } from '../services/configurations.mjs';
import { pullPlugins } from '../services/plugins.mjs';
import { pullBlocks } from '../services/blocks.mjs';
import { logger } from '../services/logger.mjs';
import fs from 'node:fs';
import path from 'node:path';

export default async function pullController({ type, path: targetPath }) {
  try {
    // Validate parent directory exists
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      logger.error(`Parent directory does not exist: ${parentDir}`);
      logger.info('Please ensure the parent directory exists');
      process.exit(1);
    }

    // Warn if target path exists and is not a directory
    if (fs.existsSync(targetPath) && !fs.statSync(targetPath).isDirectory()) {
      logger.error(`Path exists but is not a directory: ${targetPath}`);
      logger.info('Please provide a directory path, not a file');
      process.exit(1);
    }

    const sdk = await initializeSdk();

    // Handle "all" or "*" type
    if (type === 'all' || type === '*') {
      logger.section(`Pulling all resources to ${targetPath}`);
      
      const types = [
        { name: 'components', fn: pullComponents },
        { name: 'blueprints', fn: pullBlueprints },
        { name: 'configs', fn: pullConfigurations },
        { name: 'plugins', fn: pullPlugins },
        { name: 'blocks', fn: pullBlocks }
      ];

      for (const { name, fn } of types) {
        const typePath = path.join(targetPath, name);
        logger.section(`Pulling ${name} to ${typePath}`);
        try {
          await fn(sdk, typePath);
          logger.success(`Successfully pulled ${name}`);
        } catch (error) {
          logger.error(`Failed to pull ${name}`, error);
        }
      }

      logger.success(`Successfully pulled all resources to ${targetPath}`);
      return;
    }

    logger.section(`Pulling ${type} to ${targetPath}`);

    if (type === 'components') {
      await pullComponents(sdk, targetPath);
    } else if (type === 'blueprints') {
      await pullBlueprints(sdk, targetPath);
    } else if (type === 'plugins') {
      await pullPlugins(sdk, targetPath);
    } else if (type === 'blocks') {
      await pullBlocks(sdk, targetPath);
    } else if (type === 'config' || type === 'configs' || type === 'configuration') {
      await pullConfigurations(sdk, targetPath);
    } else {
      logger.error(`Unknown type: ${type}`);
      logger.info('Supported types: components, blueprints, plugins, blocks, config, configs, configuration, all');
      process.exit(1);
    }

    logger.success(`Successfully pulled ${type} to ${targetPath}`);

  } catch (error) {
    logger.error(`Failed to pull ${type}`, error);
    process.exit(1);
  }
}
