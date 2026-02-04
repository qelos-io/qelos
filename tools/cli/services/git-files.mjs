import { execSync } from 'node:child_process';
import { logger } from './logger.mjs';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Resolve the actual file path from Git output
 * Git might show temp paths or different formats, so we need to find the real file
 * @param {string} gitPath - Path as reported by Git
 * @param {string} basePath - Base path to search for the actual file
 * @returns {string|null} The actual file path or null if not found
 */
function resolveActualFilePath(gitPath, basePath) {
  // First try the direct path
  const directPath = path.resolve(basePath, gitPath);
  if (fs.existsSync(directPath)) {
    return directPath;
  }
  
  // If it's an HTML file, it might be in a micro-frontends directory
  if (gitPath.endsWith('.html')) {
    // Try to find it in any plugin's micro-frontends directory
    const pluginsDir = path.join(basePath, 'plugins');
    if (fs.existsSync(pluginsDir)) {
      const plugins = fs.readdirSync(pluginsDir);
      const filename = path.basename(gitPath);
      
      for (const plugin of plugins) {
        const mfPath = path.join(pluginsDir, plugin, 'micro-frontends', filename);
        if (fs.existsSync(mfPath)) {
          return mfPath;
        }
      }
    }
  }
  
  // For other files, try searching in common directories
  const filename = path.basename(gitPath);
  const searchDirs = [
    'components',
    'blueprints', 
    'configs',
    'plugins',
    'blocks',
    'integrations',
    'connections',
    'prompts'
  ];
  
  for (const dir of searchDirs) {
    const searchPath = path.join(basePath, dir, filename);
    if (fs.existsSync(searchPath)) {
      return searchPath;
    }
  }
  
  // If still not found, return null
  return null;
}

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
 * Find configuration files that reference a specific HTML file via $ref
 * @param {string} refPath - The referenced file path (relative)
 * @param {string} basePath - Base path to search for configurations
 * @returns {string[]} Array of configuration file paths that reference the HTML file
 */
function findReferencingConfigs(refPath, basePath) {
  const referencingConfigs = [];
  const configsDir = path.join(basePath, 'configs');
  
  if (!fs.existsSync(configsDir)) {
    return referencingConfigs;
  }
  
  const configFiles = fs.readdirSync(configsDir)
    .filter(file => file.endsWith('.config.json'));
  
  for (const file of configFiles) {
    const filePath = path.join(configsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content);
      
      // Check all $ref references in the config
      const refs = findAllRefs(config);
      
      // Check if any ref matches our target HTML file
      // Normalize paths for comparison (handle ./ and different separators)
      const normalizedRefPath = refPath.replace(/^\.\//, '').replace(/\\/g, '/');
      
      if (refs.some(ref => {
        const normalizedRef = ref.replace(/^\.\//, '').replace(/\\/g, '/');
        return normalizedRef === normalizedRefPath;
      })) {
        referencingConfigs.push(filePath);
      }
    } catch (error) {
      logger.debug(`Failed to parse config ${file}: ${error.message}`);
    }
  }
  
  return referencingConfigs;
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
    // Try to resolve the actual file path (handles Git temp paths)
    let fullPath = path.resolve(basePath, file);
    
    // If the direct path doesn't exist, try to find the actual file
    if (!fs.existsSync(fullPath)) {
      const resolvedPath = resolveActualFilePath(file, basePath);
      if (resolvedPath) {
        logger.debug(`Resolved Git path ${file} to actual path ${resolvedPath}`);
        fullPath = resolvedPath;
      } else {
        logger.warning(`File not found, skipping: ${file}`);
        continue;
      }
    }
    
    // Make sure the file exists
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
      // HTML files can be in different contexts:
      // 1. In plugins directory -> micro-frontends (part of a plugin)
      // 2. In configs directory -> These are typically referenced by configs, not pushed directly
      // 3. Other locations -> treat as micro-frontends
      
      if (relativePath.includes('configs/') || relativePath.includes('configs\\')) {
        // HTML file in configs directory - these are usually referenced by config files, not pushed directly
        logger.debug(`Found HTML file in configs directory (will be pushed via referencing config): ${relativePath}`);
        
        // Find configs that reference this HTML file
        const refPath = './' + path.relative('configs', relativePath);
        const referencingConfigs = findReferencingConfigs(refPath, basePath);
        
        // Add the referencing configs to the configs list
        for (const configPath of referencingConfigs) {
          if (!classified.configs.includes(configPath)) {
            classified.configs.push(configPath);
            logger.debug(`Found config referencing HTML ${relativePath}: ${path.basename(configPath)}`);
          }
        }
      } else {
        // Find plugins that contain this HTML file (micro-frontends)
        classified.microFrontends.push(fullPath);
        
        // For HTML files, we need to find which plugin contains them
        // HTML files in plugins are typically part of the plugin structure
        let pluginDir = path.dirname(fullPath);
        let pluginJson = path.join(pluginDir, 'plugin.json');
        
        // If the file is in a temp path or unusual location, try to find the actual plugin
        if (!fs.existsSync(pluginJson)) {
          // Check if we're in a micro-frontends subdirectory
          if (path.basename(pluginDir) === 'micro-frontends' || 
              relativePath.includes('micro-frontends/') ||
              relativePath.includes('micro-frontends\\')) {
            // Go up one more level to find the plugin directory
            pluginDir = path.dirname(pluginDir);
            pluginJson = path.join(pluginDir, 'plugin.json');
          }
          
          // If still not found, try searching for plugin.json in parent directories
          if (!fs.existsSync(pluginJson)) {
            let searchDir = pluginDir;
            for (let i = 0; i < 3; i++) { // Search up to 3 levels up
              searchDir = path.dirname(searchDir);
              const testPluginJson = path.join(searchDir, 'plugin.json');
              if (fs.existsSync(testPluginJson)) {
                pluginJson = testPluginJson;
                break;
              }
            }
          }
        }
        
        if (fs.existsSync(pluginJson)) {
          // This HTML file is part of a plugin
          if (!classified.plugins.includes(pluginJson)) {
            classified.plugins.push(pluginJson);
            logger.debug(`Found plugin containing HTML ${relativePath}: ${path.basename(pluginJson)}`);
          }
        } else {
          logger.warning(`Could not find plugin.json for HTML file: ${relativePath}`);
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
      if (key === 'prompts') {
        logger.info(`  ${key}: ${value.length} file(s) (will be pushed via parent)`);
      } else if (key === 'microFrontends') {
        logger.info(`  ${key}: ${value.length} file(s) (will be pushed via parent plugin)`);
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
      
      // If this is a config, check for $ref files and copy them too
      if (type === 'configs' && file.endsWith('.config.json')) {
        try {
          const content = fs.readFileSync(dest, 'utf-8');
          const config = JSON.parse(content);
          const refs = findAllRefs(config);
          
          for (const ref of refs) {
            if (copiedRefs.has(ref)) continue;
            
            // Resolve the ref path relative to the original file location
            const originalDir = path.dirname(file);
            const refSourcePath = path.resolve(originalDir, ref);
            
            if (fs.existsSync(refSourcePath)) {
              // Create the same directory structure in temp
              // The ref is relative to the config file, so we need to copy it to the same relative path
              const refDestPath = path.join(tempDir, 'configs', ref);
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
      
      // If this is a plugin, check for micro-frontend HTML files and copy them too
      if (type === 'plugins' && file.endsWith('.plugin.json')) {
        try {
          const content = fs.readFileSync(dest, 'utf-8');
          const plugin = JSON.parse(content);
          
          // Check if plugin has micro-frontends
          if (plugin.microFrontends && plugin.microFrontends.length > 0) {
            // Create micro-frontends directory in temp
            const mfTempDir = path.join(tempDir, 'plugins', 'micro-frontends');
            fs.mkdirSync(mfTempDir, { recursive: true });
            
            for (const mf of plugin.microFrontends) {
              if (mf.structure && mf.structure.$ref) {
                const refPath = mf.structure.$ref;
                
                // Resolve the ref path relative to the original plugin file location
                const originalDir = path.dirname(file);
                const mfSourcePath = path.resolve(originalDir, refPath);
                
                if (fs.existsSync(mfSourcePath)) {
                  const mfFileName = path.basename(refPath);
                  const mfDestPath = path.join(mfTempDir, mfFileName);
                  
                  fs.copyFileSync(mfSourcePath, mfDestPath);
                  logger.debug(`Copied micro-frontend ${refPath} from ${mfSourcePath} to ${mfDestPath}`);
                } else {
                  logger.debug(`Micro-frontend file not found: ${mfSourcePath}`);
                }
              }
            }
          }
        } catch (error) {
          logger.debug(`Failed to process micro-frontends for ${path.basename(file)}: ${error.message}`);
        }
      }
    }
  }

  return tempPaths;
}
