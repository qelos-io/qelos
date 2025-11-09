import { initializeSdk } from '../services/sdk.mjs';
import { pushComponents } from '../services/components.mjs';
import { pushBlueprints } from '../services/blueprints.mjs';
import { pushConfigurations } from '../services/configurations.mjs';
import { logger } from '../services/logger.mjs';
import fs from 'node:fs';

export default async function pushController({ type, path }) {
  try {
    // Validate path exists
    if (!fs.existsSync(path)) {
      logger.error(`Path does not exist: ${path}`);
      logger.info('Please provide a valid directory path');
      process.exit(1);
    }

    // Validate path is a directory
    if (!fs.statSync(path).isDirectory()) {
      logger.error(`Path is not a directory: ${path}`);
      logger.info('Please provide a directory path, not a file');
      process.exit(1);
    }

    const sdk = await initializeSdk();

    logger.section(`Pushing ${type} from ${path}`);

    if (type === 'components') {
      await pushComponents(sdk, path);
    } else if (type === 'blueprints') {
      await pushBlueprints(sdk, path);
    } else if (type === 'config' || type === 'configs' || type === 'configuration') {
      await pushConfigurations(sdk, path);
    } else {
      logger.error(`Unknown type: ${type}`);
      logger.info('Supported types: components, blueprints, config, configs, configuration');
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