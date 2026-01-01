import { initializeSdk } from '../services/sdk.mjs';
import { pushComponents } from '../services/components.mjs';
import { pushBlueprints } from '../services/blueprints.mjs';
import { pushConfigurations } from '../services/configurations.mjs';
import { pushPlugins } from '../services/plugins.mjs';
import { pushBlocks } from '../services/blocks.mjs';
import { pushIntegrations } from '../services/integrations.mjs';
import { pushConnections } from '../services/connections.mjs';
import { getGitFiles, prepareTempDirectories } from '../services/git-files.mjs';
import { logger } from '../services/logger.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

export default async function pushController({ type, path: sourcePath }) {
  let tempDir = null;
  
  try {
    // Handle git-based types (committed and staged)
    if (type === 'committed' || type === 'staged') {
      // Validate path exists and is a directory
      if (!fs.existsSync(sourcePath)) {
        logger.error(`Path does not exist: ${sourcePath}`);
        logger.info('Please provide a valid directory path');
        process.exit(1);
      }

      const stat = fs.statSync(sourcePath);
      if (!stat.isDirectory()) {
        logger.error(`For ${type} files, path must be a directory: ${sourcePath}`);
        process.exit(1);
      }

      // Get and classify files from git
      const classifiedFiles = getGitFiles(type, sourcePath);
      
      // Check if we have any files to push
      const hasFiles = Object.values(classifiedFiles).some(files => files.length > 0);
      if (!hasFiles) {
        logger.info(`No ${type} files to push`);
        return;
      }

      // Create temporary directory
      tempDir = await mkdtemp(path.join(tmpdir(), 'qelos-push-'));
      
      // Prepare temporary directories and copy files
      const tempPaths = prepareTempDirectories(classifiedFiles, tempDir);
      
      logger.section(`Pushing ${type} files from ${sourcePath}`);
      
      const sdk = await initializeSdk();
      
      // Push each type of file
      const types = [
        { name: 'components', fn: pushComponents },
        { name: 'blueprints', fn: pushBlueprints },
        { name: 'configs', fn: pushConfigurations },
        { name: 'plugins', fn: pushPlugins },
        { name: 'blocks', fn: pushBlocks },
        { name: 'integrations', fn: pushIntegrations },
        { name: 'connections', fn: pushConnections }
      ];

      for (const { name, fn } of types) {
        if (!tempPaths[name]) continue;
        
        logger.section(`Pushing ${name} (${classifiedFiles[name].length} file(s))`);
        
        // Show the actual files being pushed
        classifiedFiles[name].forEach(file => {
          logger.step(`→ ${path.relative(sourcePath, file)}`);
        });
        
        try {
          await fn(sdk, tempPaths[name]);
          logger.success(`Successfully pushed ${name}`);
        } catch (error) {
          logger.error(`Failed to push ${name}`, error);
        }
      }

      // Handle special cases (prompts and micro-frontends)
      if (classifiedFiles.prompts.length > 0) {
        logger.info(`Found ${classifiedFiles.prompts.length} prompt file(s) that will be pushed via their parent integrations`);
      }
      
      if (classifiedFiles.microFrontends.length > 0) {
        logger.info(`Found ${classifiedFiles.microFrontends.length} micro-frontend HTML file(s) that will be pushed via their parent plugins`);
      }

      logger.success(`Successfully pushed ${type} files`);
      return;
    }

    // Original logic for other types
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
        { name: 'blocks', fn: pushBlocks },
        { name: 'integrations', fn: pushIntegrations },
        { name: 'connections', fn: pushConnections }
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
    } else if (type === 'integrations' || type === 'integration') {
      await pushIntegrations(sdk, basePath, { targetFile });
    } else if (type === 'connections' || type === 'connection') {
      await pushConnections(sdk, basePath, { targetFile });
    } else if (type === 'config' || type === 'configs' || type === 'configuration') {
      await pushConfigurations(sdk, basePath, { targetFile });
    } else {
      logger.error(`Unknown type: ${type}`);
      logger.info('Supported types: components, blueprints, plugins, blocks, integrations, connections, config, configs, configuration, committed, staged, all');
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
  } finally {
    // Clean up temporary directory if it was created
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        logger.debug(`Cleaned up temporary directory: ${tempDir}`);
      } catch (error) {
        logger.warning(`Failed to clean up temporary directory: ${tempDir}`, error);
      }
    }
  }
}