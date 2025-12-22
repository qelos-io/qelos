import fs from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.mjs';
import { extractIntegrationContent, resolveReferences } from './file-refs.mjs';

const INTEGRATION_FILE_EXTENSION = '.integration.json';
const INTEGRATIONS_API_PATH = '/api/integrations';
const SERVER_ONLY_FIELDS = ['tenant', 'plugin', 'user', 'created', 'updated', '__v'];

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
  return sanitized;
}

async function fetchIntegrations(sdk) {
  return sdk.callJsonApi(INTEGRATIONS_API_PATH);
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

  const usedNames = new Set();
  integrations.forEach((integration, index) => {
    const fileName = buildFileName(integration, index, usedNames);
    const filePath = join(targetPath, fileName);
    
    // Extract content to files for AI agents
    const processedIntegration = extractIntegrationContent(integration, targetPath, fileName);
    
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
      
      // Resolve any $ref references in the integration
      const resolvedIntegration = await resolveReferences(integrationData, path);
      
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

      // Persist returned integration (with _id) back to disk
      writeIntegrationFile(filePath, sanitizeIntegrationForFile(response));
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
