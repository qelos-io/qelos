import { initializeSdk } from '../services/config/sdk.mjs';
import { pushComponents } from '../services/resources/components.mjs';
import { pushBlueprints } from '../services/blueprint/blueprints.mjs';
import { pushConfigurations } from '../services/resources/configurations.mjs';
import { pushPlugins } from '../services/resources/plugins.mjs';
import { pushBlocks } from '../services/resources/blocks.mjs';
import { pushIntegrations } from '../services/resources/integrations.mjs';
import { pushConnections } from '../services/resources/connections.mjs';
import { getGitFiles, prepareTempDirectories } from '../services/git/files.mjs';
import { checkDuplicateIdentifiers, displayDuplicateConflicts } from '../services/utils/duplicate-checker.mjs';
import { logger } from '../services/utils/logger.mjs';
import { getLocalFiles, getRemoteResources, getIdentifierFromFile, confirmHardPush, removeResources } from '../services/utils/hard-push.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

export default async function pushController({ type, path: sourcePath, hard = false }) {
  let tempDir = null;
  
  // Validate hard flag usage
  if (hard) {
    const validTypes = ['components', 'blueprints', 'plugins', 'integrations', 'all', '*'];
    if (!validTypes.includes(type)) {
      logger.error('--hard flag is only available for: components, blueprints, plugins, integrations, or all');
      process.exit(1);
    }
  }
  
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
        
        // Check for duplicate identifiers (skip components and blocks as they can't have duplicates)
        if (name !== 'components' && name !== 'blocks') {
          const duplicates = checkDuplicateIdentifiers(classifiedFiles[name], name, tempPaths[name]);
          if (duplicates.length > 0) {
            displayDuplicateConflicts(duplicates, name);
            process.exit(1);
          }
        }
        
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
      
      // Prevent using hard flag with single files
      if (hard) {
        logger.error('--hard flag can only be used when pushing a directory, not a single file');
        process.exit(1);
      }
    } else if (!stat.isDirectory()) {
      logger.error(`Path must be a file or directory: ${sourcePath}`);
      process.exit(1);
    }

    // Check for duplicate identifiers when pushing a directory
    if (!targetFile && type !== 'components' && type !== 'blocks') {
      // basePath is already the directory path when pushing a directory
      const typePath = basePath;
      if (fs.existsSync(typePath)) {
        let resourceFiles = [];
        
        // For other types, just look at the top level
        const files = fs.readdirSync(typePath);
        resourceFiles = files.filter(file => {
          if (type === 'blueprints') return file.endsWith('.blueprint.json');
          if (type === 'configs') return file.endsWith('.config.json');
          if (type === 'plugins') return file.endsWith('.plugin.json');
          if (type === 'integrations' || type === 'integration') return file.endsWith('.integration.json');
          if (type === 'connections' || type === 'connection') return file.endsWith('.connection.json');
          return false;
        });
        
        const filePaths = resourceFiles.map(file => path.join(typePath, file));
        const duplicates = checkDuplicateIdentifiers(filePaths, type, typePath);
        if (duplicates.length > 0) {
          displayDuplicateConflicts(duplicates, type);
          process.exit(1);
        }
      }
    }

    // Handle hard push logic for individual types (only when pushing directories)
    if (hard && !targetFile && ['components', 'blueprints', 'plugins', 'integrations'].includes(type)) {
      logger.info('Checking for resources to remove...');
      
      const sdk = await initializeSdk();
      const typePath = basePath;
      
      // Get local files
      const localFiles = getLocalFiles(typePath, type);
      const localIdentifiers = localFiles.map(file => getIdentifierFromFile(file, type));
      
      // Get remote resources
      const remoteResources = await getRemoteResources(sdk, type);
      const remoteIdentifiers = remoteResources.map(r => r.identifier || r.key || r.apiPath || r._id);
      
      // Find resources to remove (exist remotely but not locally)
      const toRemove = remoteIdentifiers
        .filter(id => !localIdentifiers.includes(id))
        .map(identifier => ({ type, identifier }));
      
      if (toRemove.length > 0) {
        const confirmed = await confirmHardPush(toRemove);
        if (!confirmed) {
          logger.info('Operation cancelled by user.');
          process.exit(0);
        }
        
        // Store the removal list for later (after push)
        // We'll use an environment variable to pass it to the post-push cleanup
        process.env.QELOS_HARD_PUSH_REMOVE = JSON.stringify(toRemove);
        logger.info(`Will remove ${toRemove.length} ${type} after push completes`);
      } else {
        logger.info('No resources to remove');
      }
    }

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
        
        // Get all files in the directory
        const files = fs.readdirSync(typePath);
        const resourceFiles = files.filter(file => {
          if (name === 'components') return file.endsWith('.vue');
          if (name === 'blocks') return file.endsWith('.html');
          if (name === 'blueprints') return file.endsWith('.blueprint.json');
          if (name === 'configs') return file.endsWith('.config.json');
          if (name === 'plugins') return file.endsWith('.plugin.json');
          if (name === 'integrations') return file.endsWith('.integration.json');
          if (name === 'connections') return file.endsWith('.connection.json');
          return false;
        });
        
        // Check for duplicate identifiers (skip components and blocks as they can't have duplicates)
        if (name !== 'components' && name !== 'blocks') {
          const filePaths = resourceFiles.map(file => path.join(typePath, file));
          const duplicates = checkDuplicateIdentifiers(filePaths, name, typePath);
          if (duplicates.length > 0) {
            displayDuplicateConflicts(duplicates, name);
            process.exit(1);
          }
        }
      }
      
      // Initialize SDK only after duplicate checks pass
      const sdk = await initializeSdk();
      
      // Handle hard push logic for "all" type
      if (hard) {
        logger.info('Checking for resources to remove...');
        
        const toRemoveAll = [];
        
        // Check each type
        for (const { name } of types) {
          if (!['components', 'blueprints', 'plugins', 'integrations'].includes(name)) continue;
          
          const typePath = path.join(basePath, name);
          if (!fs.existsSync(typePath)) continue;
          
          // Get local files
          const localFiles = getLocalFiles(typePath, name);
          const localIdentifiers = localFiles.map(file => getIdentifierFromFile(file, name));
          
          // Get remote resources
          const remoteResources = await getRemoteResources(sdk, name);
          const remoteIdentifiers = remoteResources.map(r => r.identifier);
          
          // Find resources to remove
          const toRemove = remoteIdentifiers
            .filter(id => !localIdentifiers.includes(id))
            .map(identifier => ({ type: name, identifier }));
          
          toRemoveAll.push(...toRemove);
        }
        
        if (toRemoveAll.length > 0) {
          const confirmed = await confirmHardPush(toRemoveAll);
          if (!confirmed) {
            logger.info('Operation cancelled by user.');
            process.exit(0);
          }
          
          // Store the removal list for later (after push)
          process.env.QELOS_HARD_PUSH_REMOVE = JSON.stringify(toRemoveAll);
          logger.info(`Will remove ${toRemoveAll.length} resources after push completes`);
        } else {
          logger.info('No resources to remove');
        }
      }
      
      // Now push all types
      for (const { name, fn } of types) {
        const typePath = path.join(basePath, name);
        
        // Skip if directory doesn't exist
        if (!fs.existsSync(typePath)) {
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

    // Initialize SDK for individual type pushes
    const sdk = await initializeSdk();

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
    
    // Handle hard push cleanup (remove resources after successful push)
    if (process.env.QELOS_HARD_PUSH_REMOVE) {
      try {
        const toRemove = JSON.parse(process.env.QELOS_HARD_PUSH_REMOVE);
        if (toRemove.length > 0) {
          const sdk = await initializeSdk();
          await removeResources(sdk, toRemove);
          logger.success(`Removed ${toRemove.length} resources that no longer exist locally`);
        }
      } catch (error) {
        logger.error('Failed to remove resources after push:', error);
      } finally {
        // Clean up the environment variable
        delete process.env.QELOS_HARD_PUSH_REMOVE;
      }
    }
  }
}