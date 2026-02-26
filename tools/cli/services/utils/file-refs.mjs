import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger.mjs';

/**
 * Configuration mapping for which fields should be extracted to files for each config type
 */
const CONFIG_EXTRACTION_MAP = {
  'ssr-scripts': {
    fields: ['head', 'body'],
    fileExtension: '.html',
    subdirectory: 'html'
  },
  'users-header': {
    fields: ['html'],
    fileExtension: '.html',
    subdirectory: 'html'
  }
};

/**
 * Check if an integration is an AI agent that should have its pre_messages extracted
 * @param {Object} integration - Integration object
 * @returns {boolean} True if this is an AI agent with chatCompletion
 */
function isAiAgent(integration) {
  return (
    integration &&
    Array.isArray(integration.kind) &&
    integration.kind.includes('qelos') &&
    integration.trigger?.operation === 'chatCompletion' &&
    integration.target?.operation === 'chatCompletion' &&
    integration.target?.details?.pre_messages?.length > 0
  );
}

/**
 * Convert a string to kebab-case for filenames
 * @param {string} str - String to convert
 * @returns {string} Kebab-cased string
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Load content from a $ref reference
 * @param {string} ref - Reference path (relative, absolute, or URL)
 * @param {string} basePath - Base path for resolving relative references
 * @returns {Promise<string>} Loaded content
 */
export async function loadReference(ref, basePath) {
  // Handle HTTP/HTTPS URLs
  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    logger.debug(`Loading reference from URL: ${ref}`);
    try {
      const response = await fetch(ref);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      throw new Error(`Failed to load from URL ${ref}: ${error.message}`);
    }
  }

  // Handle absolute and relative paths
  const filePath = path.isAbsolute(ref) 
    ? ref 
    : path.resolve(basePath, ref);

  logger.debug(`Loading reference from file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Referenced file does not exist: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Recursively resolve all $ref references in an object
 * @param {any} obj - Object to resolve references in
 * @param {string} basePath - Base path for resolving relative references
 * @returns {Promise<any>} Object with all references resolved
 */
export async function resolveReferences(obj, basePath) {
  if (Array.isArray(obj)) {
    return await Promise.all(obj.map(item => resolveReferences(item, basePath)));
  }
  
  if (obj && typeof obj === 'object') {
    // Check if this is a $ref object
    if (obj.$ref && typeof obj.$ref === 'string') {
      return await loadReference(obj.$ref, basePath);
    }
    
    // Otherwise, recursively resolve all properties
    const resolved = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = await resolveReferences(value, basePath);
    }
    return resolved;
  }
  
  // Primitive value, return as-is
  return obj;
}

/**
 * Extract content from integration pre_messages to separate files
 * @param {Object} integration - Integration object
 * @param {string} integrationPath - Path where integration files are stored
 * @param {string} fileName - Name of the integration file (without extension)
 * @returns {Object} Updated integration with $ref objects
 */
export function extractIntegrationContent(integration, integrationPath, fileName) {
  // Check if this is an AI agent
  if (!isAiAgent(integration)) {
    return integration;
  }

  const updatedIntegration = JSON.parse(JSON.stringify(integration)); // Deep clone
  
  // Create prompts subdirectory if needed
  const extractDir = path.join(integrationPath, 'prompts');
  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
    logger.debug(`Created directory: ${extractDir}`);
  }

  // Extract the first pre_message content
  const preMessage = updatedIntegration.target.details.pre_messages[0];
  if (preMessage && preMessage.content) {
    // Check if content is already a $ref
    if (typeof preMessage.content === 'object' && preMessage.content.$ref) {
      return updatedIntegration;
    }
    
    // Only extract if content is a string
    if (typeof preMessage.content === 'string') {
      const content = preMessage.content;
      
      // Skip if content is empty or just whitespace
      if (!content.trim()) {
        return updatedIntegration;
      }

      // Generate filename
      const baseName = path.basename(fileName, '.integration.json');
      const mdFileName = `${baseName}.md`;
      const mdFilePath = path.join(extractDir, mdFileName);
      const relativeRef = `./prompts/${mdFileName}`;

      // Write content to file
      fs.writeFileSync(mdFilePath, content, 'utf-8');

      // Replace with $ref
      updatedIntegration.target.details.pre_messages[0].content = { $ref: relativeRef };
    }
  }

  return updatedIntegration;
}

/**
 * Extract all integrations that have content to be externalized
 * @param {Array} integrations - Array of integration objects
 * @param {string} integrationPath - Path where integration files are stored
 * @returns {Array} Updated integrations with $ref objects
 */
export function extractAllIntegrationContent(integrations, integrationPath) {
  return integrations.map((integration, index) => {
    // Generate a filename for this integration
    const displayName = integration?.trigger?.details?.name || 
                       integration?.target?.details?.name || 
                       integration?._id || 
                       `integration-${index + 1}`;
    const fileName = `${toKebabCase(displayName)}.integration.json`;
    
    return extractIntegrationContent(integration, integrationPath, fileName);
  });
}
export function extractConfigContent(config, configPath) {
  const extractionConfig = CONFIG_EXTRACTION_MAP[config.key];
  
  if (!extractionConfig || !config.metadata) {
    return config;
  }

  const updatedConfig = JSON.parse(JSON.stringify(config)); // Deep clone
  const { fields, fileExtension, subdirectory } = extractionConfig;
  
  // Create subdirectory if needed
  const extractDir = path.join(configPath, subdirectory);
  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
    logger.debug(`Created directory: ${extractDir}`);
  }

  // Extract each field
  for (const field of fields) {
    if (updatedConfig.metadata[field] && typeof updatedConfig.metadata[field] === 'string') {
      const content = updatedConfig.metadata[field];
      
      // Skip if content is empty or just whitespace
      if (!content.trim()) {
        continue;
      }

      // Generate filename - use config key if only one field, otherwise include field name
      let fileName;
      if (fields.length === 1) {
        fileName = `${config.key}${fileExtension}`;
      } else {
        fileName = `${config.key}-${field}${fileExtension}`;
      }
      const filePath = path.join(extractDir, fileName);
      const relativeRef = `./${subdirectory}/${fileName}`;

      // Write content to file
      fs.writeFileSync(filePath, content, 'utf-8');
      logger.debug(`Extracted ${field} to: ${relativeRef}`);

      // Replace with $ref
      updatedConfig.metadata[field] = { $ref: relativeRef };
    }
  }

  return updatedConfig;
}

/**
 * Extract all configurations that have content to be externalized
 * @param {Array} configs - Array of configuration objects
 * @param {string} configPath - Path where config files are stored
 * @returns {Array} Updated configurations with $ref objects
 */
export function extractAllConfigContent(configs, configPath) {
  return configs.map(config => extractConfigContent(config, configPath));
}

/**
 * Recursively find all $ref objects in an object
 * @param {any} obj - Object to search
 * @param {Array} refs - Array to collect found references (used internally)
 * @returns {Array} Array of found $ref paths
 */
export function findAllRefs(obj, refs = []) {
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
