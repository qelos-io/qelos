import { execSync } from 'node:child_process';
import { logger } from './logger.mjs';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Get the list of files committed in the last commit
 * @returns {string[]} Array of file paths
 */
function getCommittedFiles() {
  try {
    const output = execSync('git diff-tree --no-commit-id --name-only -r HEAD', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(file => file);
  } catch (error) {
    logger.error('Failed to get committed files', error);
    throw new Error('Unable to retrieve committed files from git');
  }
}

/**
 * Get the list of staged files
 * @returns {string[]} Array of file paths
 */
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(file => file);
  } catch (error) {
    logger.error('Failed to get staged files', error);
    throw new Error('Unable to retrieve staged files from git');
  }
}

/**
 * Find integration files that reference a specific file via $ref
 * @param {string} refPath - The referenced file path (relative)
 * @param {string} basePath - Base path to search for integrations
 * @returns {string[]} Array of integration file paths that reference the file
 */
function findReferencingIntegrations(refPath, basePath) {
  const referencingIntegrations = [];
  const integrationsDir = path.join(basePath, 'integrations');
  
  if (!fs.existsSync(integrationsDir)) {
    return referencingIntegrations;
  }
  
  const integrationFiles = fs.readdirSync(integrationsDir)
    .filter(file => file.endsWith('.integration.json'));
  
  for (const file of integrationFiles) {
    const filePath = path.join(integrationsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const integration = JSON.parse(content);
      
      // Check all $ref references in the integration
      const refs = findAllRefs(integration);
      
      // Check if any ref matches our target path
      // Normalize paths for comparison (handle ./ and different separators)
      const normalizedRefPath = refPath.replace(/^\.\//, '').replace(/\\/g, '/');
      
      if (refs.some(ref => {
        const normalizedRef = ref.replace(/^\.\//, '').replace(/\\/g, '/');
        return normalizedRef === normalizedRefPath;
      })) {
        referencingIntegrations.push(filePath);
      }
    } catch (error) {
      logger.debug(`Failed to parse integration ${file}: ${error.message}`);
    }
  }
  
  return referencingIntegrations;
}

/**
 * Recursively find all $ref objects in an object
 * @param {any} obj - Object to search
 * @param {Array} refs - Array to collect found references (used internally)
 * @returns {Array} Array of found $ref paths
 */
function findAllRefs(obj, refs = []) {
  if (Array.isArray(obj)) {
    obj.forEach(item => findAllRefs(item, refs));
  } else if (obj && typeof obj === 'object') {
    if (obj.$ref && typeof obj.$ref === 'string') {
      refs.push(obj.$ref);
    } else {
      Object.values(obj).forEach(value => findAllRefs(value, refs));
    }
  }
  return refs;
}

/**
 * Classify files by their type based on their location and extension
 * @param {string[]} files - Array of file paths
 * @param {string} basePath - Base path to resolve relative paths from
 * @returns {Object} Object with file paths grouped by type
 */
function classifyFiles(files, basePath) {
  const classified = {
    components: [],
    blueprints: [],
    configs: [],
    plugins: [],
    blocks: [],
    integrations: [],
    connections: [],
    prompts: [], // For .md files in prompts directories
    microFrontends: [] // For .html files
  };

  for (const file of files) {
    // Make sure the file exists
    const fullPath = path.resolve(basePath, file);
    if (!fs.existsSync(fullPath)) {
      logger.warning(`File not found, skipping: ${file}`);
      continue;
    }

    const relativePath = path.relative(basePath, fullPath);
    const dir = path.dirname(relativePath);
    const ext = path.extname(fullPath);
    const basename = path.basename(fullPath, ext);

    // Check for specific file types
    if (relativePath.includes('components/') && ext === '.vue') {
      classified.components.push(fullPath);
    } else if (relativePath.includes('blueprints/') && ext === '.json') {
      classified.blueprints.push(fullPath);
    } else if (relativePath.includes('configs/') && ext === '.json') {
      classified.configs.push(fullPath);
    } else if (relativePath.includes('plugins/') && ext === '.json') {
      classified.plugins.push(fullPath);
    } else if (relativePath.includes('blocks/') && ext === '.json') {
      classified.blocks.push(fullPath);
    } else if (relativePath.includes('integrations/') && ext === '.json') {
      classified.integrations.push(fullPath);
    } else if (relativePath.includes('connections/') && ext === '.json') {
      classified.connections.push(fullPath);
    } else if (dir.includes('prompts') && ext === '.md') {
      // Find integrations that reference this prompt file
      classified.prompts.push(fullPath);
      
      // The ref path should be relative to the integrations directory
      // If file is integrations/prompts/file.md, ref should be ./prompts/file.md
      const refPath = './' + path.relative('integrations', relativePath);
      
      const referencingIntegrations = findReferencingIntegrations(refPath, basePath);
      
      // Add the referencing integrations to the integrations list
      for (const integrationPath of referencingIntegrations) {
        if (!classified.integrations.includes(integrationPath)) {
          classified.integrations.push(integrationPath);
          logger.debug(`Found integration referencing ${relativePath}: ${path.basename(integrationPath)}`);
        }
      }
    } else if (ext === '.html') {
      // Find plugins that contain this HTML file (micro-frontends)
      classified.microFrontends.push(fullPath);
      
      // For HTML files, we need to find which plugin contains them
      // HTML files in plugins are typically part of the plugin structure
      const pluginDir = path.dirname(fullPath);
      const pluginJson = path.join(pluginDir, 'plugin.json');
      
      if (fs.existsSync(pluginJson)) {
        // This HTML file is part of a plugin
        if (!classified.plugins.includes(pluginJson)) {
          classified.plugins.push(pluginJson);
          logger.debug(`Found plugin containing HTML ${relativePath}: ${path.basename(pluginJson)}`);
        }
      }
    } else {
      logger.debug(`Unclassified file: ${relativePath}`);
    }
  }

  return classified;
}

/**
 * Get files from git (committed or staged) and classify them
 * @param {string} type - 'committed' or 'staged'
 * @param {string} basePath - Base path to resolve files from
 * @returns {Object} Classified files object
 */
export function getGitFiles(type, basePath) {
  if (type !== 'committed' && type !== 'staged') {
    throw new Error('Type must be either "committed" or "staged"');
  }

  const files = type === 'committed' ? getCommittedFiles() : getStagedFiles();
  
  if (files.length === 0) {
    logger.info(`No ${type} files found`);
    return {};
  }

  logger.info(`Found ${files.length} ${type} file(s)`);
  const classified = classifyFiles(files, basePath);

  // Log what we found
  Object.entries(classified).forEach(([key, value]) => {
    if (value.length > 0) {
      if (key === 'prompts' || key === 'microFrontends') {
        logger.info(`  ${key}: ${value.length} file(s) (will be pushed via parent)`);
      } else {
        logger.info(`  ${key}: ${value.length} file(s)`);
      }
    }
  });

  return classified;
}

/**
 * Create temporary directories for each type and copy files
 * @param {Object} classifiedFiles - Object with classified file paths
 * @param {string} tempDir - Temporary directory base path
 * @returns {Object} Object with paths to temporary directories
 */
export function prepareTempDirectories(classifiedFiles, tempDir) {
  const tempPaths = {};
  const copiedRefs = new Set(); // Track which ref files have been copied

  // Create temp directory structure
  fs.mkdirSync(tempDir, { recursive: true });

  for (const [type, files] of Object.entries(classifiedFiles)) {
    if (files.length === 0) continue;

    // Skip prompts and microFrontends as they are handled by their parents
    if (type === 'prompts' || type === 'microFrontends') continue;

    const typeDir = path.join(tempDir, type);
    fs.mkdirSync(typeDir, { recursive: true });
    tempPaths[type] = typeDir;

    // Use a Set to avoid duplicate files
    const uniqueFiles = [...new Set(files)];

    // Copy files to temp directory
    for (const file of uniqueFiles) {
      const dest = path.join(typeDir, path.basename(file));
      fs.copyFileSync(file, dest);
      logger.debug(`Copied ${file} to ${dest}`);
      
      // If this is an integration, check for $ref files and copy them too
      if (type === 'integrations' && file.endsWith('.integration.json')) {
        try {
          const content = fs.readFileSync(dest, 'utf-8');
          const integration = JSON.parse(content);
          const refs = findAllRefs(integration);
          
          for (const ref of refs) {
            if (copiedRefs.has(ref)) continue;
            
            // Resolve the ref path relative to the original file location
            const originalDir = path.dirname(file);
            const refSourcePath = path.resolve(originalDir, ref);
            
            if (fs.existsSync(refSourcePath)) {
              // Create the same directory structure in temp
              // The ref is relative to the integration file, so we need to copy it to the same relative path
              const refDestPath = path.join(tempDir, 'integrations', ref);
              const refDestDir = path.dirname(refDestPath);
              
              fs.mkdirSync(refDestDir, { recursive: true });
              fs.copyFileSync(refSourcePath, refDestPath);
              copiedRefs.add(ref);
              logger.debug(`Copied referenced file ${ref} from ${refSourcePath} to ${refDestPath}`);
            } else {
              logger.debug(`Referenced file not found: ${refSourcePath}`);
            }
          }
        } catch (error) {
          logger.debug(`Failed to process refs for ${path.basename(file)}: ${error.message}`);
        }
      }
    }
  }

  return tempPaths;
}
