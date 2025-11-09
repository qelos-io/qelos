import fs from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.mjs';

/**
 * Push configurations from local directory to remote
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} path - Path to configurations directory
 */
export async function pushConfigurations(sdk, path) {
  const files = fs.readdirSync(path);
  const configFiles = files.filter(f => f.endsWith('.config.json'));
  
  if (configFiles.length === 0) {
    logger.warning(`No configuration files (*.config.json) found in ${path}`);
    return;
  }
  
  logger.info(`Found ${configFiles.length} configuration(s) to push`);
  const existingConfigurations = await sdk.manageConfigurations.getList();
  
  const results = await Promise.allSettled(configFiles.map(async (file) => {
    if (file.endsWith('.config.json')) {
      let configData;
      try {
        configData = JSON.parse(fs.readFileSync(join(path, file), 'utf-8'));
      } catch (error) {
        logger.error(`Failed to parse ${file}`, error);
        throw new Error(`Parse error in ${file}: ${error.message}`);
      }
      
      const key = configData.key;
      
      if (!key) {
        logger.warning(`Skipping ${file}: missing key field`);
        return { skipped: true, file };
      }
      
      logger.step(`Pushing configuration: ${key}`);
      
      const existingConfig = existingConfigurations.find(
        config => config.key === key
      );
      
      try {
        if (existingConfig) {
          await sdk.manageConfigurations.update(key, configData);
          logger.success(`Updated: ${key}`);
        } else {
          await sdk.manageConfigurations.create(configData);
          logger.success(`Created: ${key}`);
        }
        return { success: true, key };
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
        
        logger.error(`Failed to push ${key}: ${errorMessage}`);
        
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
        
        throw new Error(`Failed to push ${key}: ${errorMessage}`);
      }
    }
  }));
  
  // Check for failures
  const failures = results.filter(r => r.status === 'rejected');
  const successes = results.filter(r => r.status === 'fulfilled' && r.value?.success);
  
  if (failures.length > 0) {
    logger.error(`\n${failures.length} configuration(s) failed to push:`);
    failures.forEach(f => {
      logger.error(`  • ${f.reason.message}`);
    });
    throw new Error(`Failed to push ${failures.length} configuration(s)`);
  }
  
  logger.info(`Pushed ${configFiles.length} configuration(s)`);
}

/**
 * Pull configurations from remote to local directory
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} targetPath - Path to save configurations
 */
export async function pullConfigurations(sdk, targetPath) {
  // Create directory if it doesn't exist
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
    logger.info(`Created directory: ${targetPath}`);
  }

  const configurations = await sdk.manageConfigurations.getList();
  
  if (configurations.length === 0) {
    logger.warning('No configurations found to pull');
    return;
  }
  
  logger.info(`Found ${configurations.length} configuration(s) to pull`);

  await Promise.all(configurations.map(async (config) => {
    const fileName = `${config.key}.config.json`;
    const filePath = join(targetPath, fileName);

    // Fetch full configuration details
    const fullConfig = await sdk.manageConfigurations.getConfiguration(config.key);
    
    // Remove fields that shouldn't be in the file
    const { _id, tenant, created, updated, ...relevantFields } = fullConfig;
    
    fs.writeFileSync(filePath, JSON.stringify(relevantFields, null, 2), 'utf-8');
    logger.step(`Pulled: ${config.key}`);
  }));

  logger.info(`Pulled ${configurations.length} configuration(s)`);
}
