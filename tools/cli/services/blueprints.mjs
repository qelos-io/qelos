import fs from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.mjs';

/**
 * Push blueprints from local directory to remote
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} path - Path to blueprints directory
 */
export async function pushBlueprints(sdk, path) {
  const files = fs.readdirSync(path);
  const blueprintFiles = files.filter(f => f.endsWith('.blueprint.json'));
  
  if (blueprintFiles.length === 0) {
    logger.warning(`No blueprint files (*.blueprint.json) found in ${path}`);
    return;
  }
  
  logger.info(`Found ${blueprintFiles.length} blueprint(s) to push`);
  const existingBlueprints = await sdk.manageBlueprints.getList();
  
  const results = await Promise.allSettled(blueprintFiles.map(async (file) => {
    if (file.endsWith('.blueprint.json')) {
      let blueprintData;
      try {
        blueprintData = JSON.parse(fs.readFileSync(join(path, file), 'utf-8'));
      } catch (error) {
        logger.error(`Failed to parse ${file}`, error);
        throw new Error(`Parse error in ${file}: ${error.message}`);
      }
      
      const identifier = blueprintData.identifier;
      
      if (!identifier) {
        logger.warning(`Skipping ${file}: missing identifier field`);
        return { skipped: true, file };
      }
      
      logger.step(`Pushing blueprint: ${identifier}`);
      
      const existingBlueprint = existingBlueprints.find(
        blueprint => blueprint.identifier === identifier
      );
      
      try {
        if (existingBlueprint) {
          await sdk.manageBlueprints.update(identifier, blueprintData);
          logger.success(`Updated: ${identifier}`);
        } else {
          await sdk.manageBlueprints.create(blueprintData);
          logger.success(`Created: ${identifier}`);
        }
        return { success: true, identifier };
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
        
        logger.error(`Failed to push ${identifier}: ${errorMessage}`);
        
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
        
        throw new Error(`Failed to push ${identifier}: ${errorMessage}`);
      }
    }
  }));
  
  // Check for failures
  const failures = results.filter(r => r.status === 'rejected');
  const successes = results.filter(r => r.status === 'fulfilled' && r.value?.success);
  
  if (failures.length > 0) {
    logger.error(`\n${failures.length} blueprint(s) failed to push:`);
    failures.forEach(f => {
      logger.error(`  • ${f.reason.message}`);
    });
    throw new Error(`Failed to push ${failures.length} blueprint(s)`);
  }
  
  logger.info(`Pushed ${blueprintFiles.length} blueprint(s)`);
}

/**
 * Pull blueprints from remote to local directory
 * @param {Object} sdk - Initialized SDK instance
 * @param {string} targetPath - Path to save blueprints
 */
export async function pullBlueprints(sdk, targetPath) {
  // Create directory if it doesn't exist
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
    logger.info(`Created directory: ${targetPath}`);
  }

  const blueprints = await sdk.manageBlueprints.getList();
  
  if (blueprints.length === 0) {
    logger.warning('No blueprints found to pull');
    return;
  }
  
  logger.info(`Found ${blueprints.length} blueprint(s) to pull`);

  await Promise.all(blueprints.map(async (blueprint) => {
    const fileName = `${blueprint.identifier}.blueprint.json`;
    const filePath = join(targetPath, fileName);

    // Fetch full blueprint details
    const fullBlueprint = await sdk.manageBlueprints.getBlueprint(blueprint.identifier);

    function removeIdFromObject(obj) {
      const { _id, ...rest } = obj;
      return rest;
    }

    const relevantFields = {
      identifier: fullBlueprint.identifier,
      name: fullBlueprint.name,
      description: fullBlueprint.description,
      properties: fullBlueprint.properties,
      relations: fullBlueprint.relations,
      dispatchers: fullBlueprint.dispatchers,
      permissions: (fullBlueprint.permissions || []).map(removeIdFromObject),
      permissionScope: fullBlueprint.permissionScope,
      entityIdentifierMechanism: fullBlueprint.entityIdentifierMechanism,
      limitations: (fullBlueprint.limitations || []).map(removeIdFromObject),
    }
    
    fs.writeFileSync(filePath, JSON.stringify(relevantFields, null, 2), 'utf-8');
    logger.step(`Pulled: ${blueprint.identifier}`);
  }));

  logger.info(`Pulled ${blueprints.length} blueprint(s)`);
}
