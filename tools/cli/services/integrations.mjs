import fs from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.mjs';
import { extractIntegrationContent, resolveReferences } from './file-refs.mjs';

const INTEGRATION_FILE_EXTENSION = '.integration.json';
const INTEGRATIONS_API_PATH = '/api/integrations';
const SERVER_ONLY_FIELDS = ['tenant', 'plugin', 'user', 'created', 'updated', '__v'];
const CONNECTION_FILE_EXTENSION = '.connection.json';

function slugify(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getIntegrationDisplayName(integration) {
  return (
    integration?.trigger?.details?.name ||
    integration?.target?.details?.name ||
    integration?._id ||
    ''
  );
}

function buildFileName(integration, index, usedNames) {
  const preferred =
    slugify(getIntegrationDisplayName(integration)) ||
    slugify(integration?._id) ||
    '';

  let baseName = preferred || `integration-${index + 1}`;

  while (usedNames.has(baseName)) {
    const suffix = integration?._id ? integration._id.slice(-4) : `${usedNames.size + 1}`;
    baseName = `${baseName}-${suffix}`;
  }

  usedNames.add(baseName);
  return `${baseName}${INTEGRATION_FILE_EXTENSION}`;
}

function validateIntegrationPayload(data, file) {
  if (!data?.trigger || !data?.target) {
    throw new Error(`Integration file ${file} must include trigger and target`);
  }

  if (!data.trigger.source || !data.trigger.operation) {
    throw new Error(`Integration ${file}: trigger must include source and operation`);
  }

  if (!data.target.source || !data.target.operation) {
    throw new Error(`Integration ${file}: target must include source and operation`);
  }
}

function toRequestPayload(data) {
  return {
    trigger: data.trigger,
    target: data.target,
    dataManipulation: data.dataManipulation || [],
    active: data.active ?? false,
  };
}

function writeIntegrationFile(filePath, integration) {
  fs.writeFileSync(filePath, JSON.stringify(integration, null, 2), 'utf-8');
}

function sanitizeIntegrationForFile(integration) {
  const sanitized = JSON.parse(JSON.stringify(integration));
  SERVER_ONLY_FIELDS.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
    }
  });
  
  // Remove _id from internal objects
  if (sanitized.trigger && sanitized.trigger._id) {
    delete sanitized.trigger._id;
  }
  
  if (sanitized.target && sanitized.target._id) {
    delete sanitized.target._id;
  }
  
  if (Array.isArray(sanitized.dataManipulation)) {
    sanitized.dataManipulation.forEach(item => {
      if (item._id) {
        delete item._id;
      }
    });
  }
  
  return sanitized;
}

async function fetchIntegrations(sdk) {
  return sdk.callJsonApi(INTEGRATIONS_API_PATH);
}

/**
 * Load all connection files and create a map of _id to file path
 * @param {string} basePath - Base path to search for connection files
 * @returns {Map<string, string>} Map of connection ID to relative file path
 */
function loadConnectionIdMap(basePath) {
  const connectionMap = new Map();
  
  // Check if connections directory exists
  const connectionsPath = join(basePath, 'connections');
  if (!fs.existsSync(connectionsPath)) {
    logger.warning('Connections directory not found, connection references will not be mapped');
    return connectionMap;
  }
  
  try {
    const connectionFiles = fs.readdirSync(connectionsPath)
      .filter(file => file.endsWith(CONNECTION_FILE_EXTENSION));
    
    for (const file of connectionFiles) {
      const filePath = join(connectionsPath, file);
      try {
        const connectionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (connectionData._id) {
          // Store relative path from the integrations directory
          const relativePath = `./connections/${file}`;
          connectionMap.set(connectionData._id, relativePath);
          logger.debug(`Mapped connection ID ${connectionData._id} to ${relativePath}`);
        }
      } catch (error) {
        logger.warning(`Failed to read connection file ${file}: ${error.message}`);
      }
    }
    
    logger.info(`Loaded ${connectionMap.size} connection mappings`);
  } catch (error) {
    logger.error('Failed to load connection files', error);
  }
  
  return connectionMap;
}

/**
 * Replace connection IDs with $refId objects in an integration
 * @param {Object} integration - Integration object
 * @param {Map<string, string>} connectionMap - Map of connection ID to file path
 * @returns {Object} Integration with connection IDs replaced by $refId objects
 */
function replaceConnectionIds(integration, connectionMap) {
  const updated = JSON.parse(JSON.stringify(integration));
  
  // Replace trigger.source if it's a connection ID
  if (updated.trigger?.source && typeof updated.trigger.source === 'string') {
    const connectionPath = connectionMap.get(updated.trigger.source);
    if (connectionPath) {
      updated.trigger.source = { $refId: connectionPath };
      logger.debug(`Replaced trigger.source ${integration.trigger.source} with ${connectionPath}`);
    }
  }
  
  // Replace target.source if it's a connection ID
  if (updated.target?.source && typeof updated.target.source === 'string') {
    const connectionPath = connectionMap.get(updated.target.source);
    if (connectionPath) {
      updated.target.source = { $refId: connectionPath };
      logger.debug(`Replaced target.source ${integration.target.source} with ${connectionPath}`);
    }
  }
  
  return updated;
}

/**
 * Resolve $refId objects to actual connection IDs
 * @param {Object} integration - Integration object with potential $refId references
 * @param {string} basePath - Base path for resolving connection files
 * @returns {Object} Integration with $refId objects resolved to IDs
 */
function resolveConnectionReferences(integration, basePath) {
  const updated = JSON.parse(JSON.stringify(integration));
  
  // Resolve trigger.source if it's a $refId object
  if (updated.trigger?.source && typeof updated.trigger.source === 'object' && updated.trigger.source.$refId) {
    const connectionPath = updated.trigger.source.$refId;
    const fullConnectionPath = join(basePath, connectionPath);
    
    try {
      if (fs.existsSync(fullConnectionPath)) {
        const connectionData = JSON.parse(fs.readFileSync(fullConnectionPath, 'utf-8'));
        if (connectionData._id) {
          updated.trigger.source = connectionData._id;
          logger.debug(`Resolved trigger.source ${connectionPath} to ID ${connectionData._id}`);
        } else {
          throw new Error('Connection file missing _id field');
        }
      } else {
        throw new Error(`Connection file not found: ${fullConnectionPath}`);
      }
    } catch (error) {
      logger.error(`Failed to resolve trigger.source reference ${connectionPath}: ${error.message}`);
      throw error;
    }
  }
  
  // Resolve target.source if it's a $refId object
  if (updated.target?.source && typeof updated.target.source === 'object' && updated.target.source.$refId) {
    const connectionPath = updated.target.source.$refId;
    const fullConnectionPath = join(basePath, connectionPath);
    
    try {
      if (fs.existsSync(fullConnectionPath)) {
        const connectionData = JSON.parse(fs.readFileSync(fullConnectionPath, 'utf-8'));
        if (connectionData._id) {
          updated.target.source = connectionData._id;
          logger.debug(`Resolved target.source ${connectionPath} to ID ${connectionData._id}`);
        } else {
          throw new Error('Connection file missing _id field');
        }
      } else {
        throw new Error(`Connection file not found: ${fullConnectionPath}`);
      }
    } catch (error) {
      logger.error(`Failed to resolve target.source reference ${connectionPath}: ${error.message}`);
      throw error;
    }
  }
  
  return updated;
}

async function createIntegration(sdk, payload) {
  return sdk.callJsonApi(INTEGRATIONS_API_PATH, {
    method: 'post',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function updateIntegration(sdk, id, payload) {
  return sdk.callJsonApi(`${INTEGRATIONS_API_PATH}/${id}`, {
    method: 'put',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function pullIntegrations(sdk, targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
    logger.info(`Created directory: ${targetPath}`);
  }

  let integrations = [];
  try {
    integrations = await fetchIntegrations(sdk);
  } catch (error) {
    logger.error('Failed to fetch integrations', error);
    throw error;
  }

  if (!Array.isArray(integrations) || integrations.length === 0) {
    logger.warning('No integrations found to pull');
    return;
  }

  logger.info(`Found ${integrations.length} integration(s) to pull`);

  // Load connection ID mappings before processing integrations
  const connectionMap = loadConnectionIdMap(targetPath);

  const usedNames = new Set();
  integrations.forEach((integration, index) => {
    const fileName = buildFileName(integration, index, usedNames);
    const filePath = join(targetPath, fileName);
    
    // Replace connection IDs with $refId references
    const integrationWithRefs = replaceConnectionIds(integration, connectionMap);
    
    // Extract content to files for AI agents
    const processedIntegration = extractIntegrationContent(integrationWithRefs, targetPath, fileName);
    
    writeIntegrationFile(filePath, sanitizeIntegrationForFile(processedIntegration));
    logger.step(`Pulled: ${getIntegrationDisplayName(integration) || integration._id || fileName}`);
  });

  logger.info(`Pulled ${integrations.length} integration(s)`);
}

export async function pushIntegrations(sdk, path, options = {}) {
  const { targetFile } = options;
  const directoryFiles = fs.readdirSync(path);
  const files = targetFile ? [targetFile] : directoryFiles;
  const integrationFiles = files.filter((f) => f.endsWith(INTEGRATION_FILE_EXTENSION));

  if (integrationFiles.length === 0) {
    if (targetFile) {
      logger.warning(`File ${targetFile} is not an ${INTEGRATION_FILE_EXTENSION} file. Skipping.`);
    } else {
      logger.warning(`No integration files (*${INTEGRATION_FILE_EXTENSION}) found in ${path}`);
    }
    return;
  }

  logger.info(`Found ${integrationFiles.length} integration(s) to push`);

  const results = [];

  for (const file of integrationFiles) {
    const filePath = join(path, file);
    try {
      const integrationData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      validateIntegrationPayload(integrationData, file);
      
      // Resolve $refId objects to actual connection IDs
      const integrationWithResolvedRefs = resolveConnectionReferences(integrationData, path);
      
      // Resolve any $ref references in the integration
      const resolvedIntegration = await resolveReferences(integrationWithResolvedRefs, path);
      
      const payload = toRequestPayload(resolvedIntegration);
      const displayName = getIntegrationDisplayName(resolvedIntegration) || file.replace(INTEGRATION_FILE_EXTENSION, '');

      logger.step(`Pushing integration: ${displayName}`);

      let response;
      if (integrationData._id) {
        response = await updateIntegration(sdk, integrationData._id, payload);
        logger.success(`Updated: ${displayName}`);
      } else {
        response = await createIntegration(sdk, payload);
        logger.success(`Created: ${displayName}`);
      }

      // Re-extract content to files to maintain $ref structure
      // This ensures pre_messages are stored as prompt md files after pushing
      const processedResponse = extractIntegrationContent(response, path, file);
      
      // Replace connection IDs with $refId objects again for the stored file
      const connectionMap = loadConnectionIdMap(path);
      const finalIntegration = replaceConnectionIds(processedResponse, connectionMap);
      
      // Persist returned integration (with _id) back to disk
      writeIntegrationFile(filePath, sanitizeIntegrationForFile(finalIntegration));
      
      results.push({ status: 'fulfilled' });
    } catch (error) {
      logger.error(`Failed to push integration file ${file}`, error);
      results.push({ status: 'rejected', reason: error });
    }
  }

  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) {
    logger.error(`\n${failures.length} integration(s) failed to push:`);
    failures.forEach((failure) => {
      logger.error(`  • ${failure.reason?.message || 'Unknown error'}`);
    });
    throw new Error(`Failed to push ${failures.length} integration(s)`);
  }

  logger.info(`Pushed ${integrationFiles.length} integration(s)`);
}

// Export helper functions for testing
export { loadConnectionIdMap, replaceConnectionIds, resolveConnectionReferences };
