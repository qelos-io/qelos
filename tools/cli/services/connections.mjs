import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger.mjs';

const CONNECTION_FILE_EXTENSION = '.connection.json';
const AUTH_PLACEHOLDER_KEY = '$var';

function slugify(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
}

function getDefaultAuthEnvVar(connection) {
  if (connection?.authentication?.[AUTH_PLACEHOLDER_KEY]) {
    return connection.authentication[AUTH_PLACEHOLDER_KEY];
  }

  if (connection?._id) {
    return `INTEGRATION_AUTH_${connection._id}`;
  }

  const slug = slugify(connection?.name || 'connection').replace(/-/g, '_').toUpperCase();
  const suffix = slug ? slug.slice(-6) : Math.random().toString(36).slice(-6).toUpperCase();
  return `INTEGRATION_AUTH_${suffix || 'NEW'}`;
}

function buildFileName(connection, index, usedNames) {
  const base =
    slugify(connection?.name) ||
    (connection?._id ? slugify(connection._id) : '') ||
    `connection-${index + 1}`;

  let fileName = base;
  while (usedNames.has(fileName)) {
    fileName = `${base}-${usedNames.size + 1}`;
  }
  usedNames.add(fileName);
  return `${fileName}${CONNECTION_FILE_EXTENSION}`;
}

function sanitizeConnectionForFile(connection) {
  return {
    _id: connection._id,
    name: connection.name,
    kind: connection.kind,
    labels: connection.labels || [],
    metadata: connection.metadata || {},
    authentication: {
      [AUTH_PLACEHOLDER_KEY]: getDefaultAuthEnvVar(connection),
    },
  };
}

function writeConnectionFile(filePath, connection) {
  fs.writeFileSync(filePath, JSON.stringify(connection, null, 2), 'utf-8');
}

function validateConnectionPayload(data, fileName) {
  if (!data?.name) {
    throw new Error(`Connection file ${fileName} must include a name`);
  }

  if (!data?.kind) {
    throw new Error(`Connection file ${fileName} must include a kind`);
  }

  if (!data?.metadata || typeof data.metadata !== 'object') {
    throw new Error(`Connection file ${fileName} must include metadata object`);
  }

  if (data.labels && !Array.isArray(data.labels)) {
    throw new Error(`Connection file ${fileName} has invalid labels (must be an array)`);
  }
}

function extractAuthenticationPayload(connectionFile, fileName) {
  const authField = connectionFile.authentication;

  if (!authField || typeof authField !== 'object') {
    return { payload: undefined, envVar: null };
  }

  const envVarName = authField[AUTH_PLACEHOLDER_KEY];

  if (!envVarName) {
    throw new Error(
      `Connection file ${fileName} must define authentication as { "${AUTH_PLACEHOLDER_KEY}": "INTEGRATION_AUTH_..." }`
    );
  }

  const raw = process.env[envVarName];

  if (!raw) {
    if (!connectionFile._id) {
      throw new Error(
        `Environment variable ${envVarName} is required to create connection defined in ${fileName}`
      );
    }

    logger.info(
      `Skipping authentication update for ${connectionFile.name} (env ${envVarName} not set)`
    );
    return { payload: undefined, envVar: envVarName };
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed) {
      throw new Error('Authentication env must contain a JSON object');
    }
    return { payload: parsed, envVar: envVarName };
  } catch (error) {
    throw new Error(
      `Failed to parse JSON from env ${envVarName} for connection ${fileName}: ${error.message}`
    );
  }
}

export async function pullConnections(sdk, targetPath) {
  ensureDirectory(targetPath);

  let connections = [];
  try {
    connections = await sdk.integrationSources.getList();
  } catch (error) {
    logger.error('Failed to fetch integration sources', error);
    throw error;
  }

  if (!Array.isArray(connections) || connections.length === 0) {
    logger.warning('No connections found to pull');
    return;
  }

  logger.info(`Found ${connections.length} connection(s) to pull`);
  const usedNames = new Set();

  connections.forEach((connection, index) => {
    const fileName = buildFileName(connection, index, usedNames);
    const filePath = path.join(targetPath, fileName);
    writeConnectionFile(filePath, sanitizeConnectionForFile(connection));
    logger.step(`Pulled connection: ${connection.name || connection._id}`);
  });

  logger.info(`Pulled ${connections.length} connection(s)`);
}

export async function pushConnections(sdk, sourcePath, options = {}) {
  const { targetFile } = options;
  const directoryFiles = fs.readdirSync(sourcePath);
  const files = targetFile ? [targetFile] : directoryFiles;
  const connectionFiles = files.filter((file) => file.endsWith(CONNECTION_FILE_EXTENSION));

  if (connectionFiles.length === 0) {
    if (targetFile) {
      logger.warning(
        `File ${targetFile} is not a ${CONNECTION_FILE_EXTENSION} connection file. Skipping.`
      );
    } else {
      logger.warning(`No connection files (*${CONNECTION_FILE_EXTENSION}) found in ${sourcePath}`);
    }
    return;
  }

  logger.info(`Found ${connectionFiles.length} connection(s) to push`);

  const results = [];

  for (const file of connectionFiles) {
    const filePath = path.join(sourcePath, file);

    try {
      const connectionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      validateConnectionPayload(connectionData, file);

      const { payload: authentication, envVar } = extractAuthenticationPayload(connectionData, file);

      const requestBody = {
        name: connectionData.name,
        kind: connectionData.kind,
        labels: connectionData.labels || [],
        metadata: connectionData.metadata || {},
        ...(authentication ? { authentication } : {}),
      };

      logger.step(`Pushing connection: ${connectionData.name}`);
      let response;

      if (connectionData._id) {
        response = await sdk.integrationSources.update(connectionData._id, requestBody);
        logger.success(`Updated connection: ${connectionData.name}`);
      } else {
        response = await sdk.integrationSources.create(requestBody);
        logger.success(`Created connection: ${connectionData.name}`);
      }

      const authPlaceholder = connectionData.authentication?.[AUTH_PLACEHOLDER_KEY]
        ? connectionData.authentication
        : { [AUTH_PLACEHOLDER_KEY]: envVar || getDefaultAuthEnvVar(response) };

      const fileContent = {
        _id: response._id,
        name: response.name,
        kind: response.kind,
        labels: response.labels || [],
        metadata: response.metadata || {},
        authentication: authPlaceholder,
      };

      writeConnectionFile(filePath, fileContent);
      results.push({ status: 'fulfilled' });
    } catch (error) {
      logger.error(`Failed to push connection file ${file}`, error);
      results.push({ status: 'rejected', reason: error });
    }
  }

  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) {
    logger.error(`\n${failures.length} connection(s) failed to push:`);
    failures.forEach((failure) => {
      logger.error(`  • ${failure.reason?.message || 'Unknown error'}`);
    });
    throw new Error(`Failed to push ${failures.length} connection(s)`);
  }

  logger.info(`Pushed ${connectionFiles.length} connection(s)`);
}
