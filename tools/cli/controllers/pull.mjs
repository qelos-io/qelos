import { initializeSdk } from '../services/sdk.mjs';
import { pullComponents } from '../services/components.mjs';
import { pullBlueprints } from '../services/blueprints.mjs';
import { pullConfigurations } from '../services/configurations.mjs';
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

    logger.section(`Pulling ${type} to ${targetPath}`);

    if (type === 'components') {
      await pullComponents(sdk, targetPath);
    } else if (type === 'blueprints') {
      await pullBlueprints(sdk, targetPath);
    } else if (type === 'config' || type === 'configs' || type === 'configuration') {
      await pullConfigurations(sdk, targetPath);
    } else {
      logger.error(`Unknown type: ${type}`);
      logger.info('Supported types: components, blueprints, config, configs, configuration');
      process.exit(1);
    }

    logger.success(`Successfully pulled ${type} to ${targetPath}`);

  } catch (error) {
    logger.error(`Failed to pull ${type}`, error);
    process.exit(1);
  }
}
