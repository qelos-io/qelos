import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { logger } from './logger.mjs';
import { generateSdkGuide } from './blueprint-sdk-guides.mjs';
import {
  formatTitle,
  toIdentifier,
  ensureSingular,
  detectBlueprintType,
  mapBlueprintTypeToJsonSchema
} from './blueprint-shared.mjs';

export const SUPPORTED_PROTOCOL = /^mongodb:\/\//i;
const SAMPLE_SIZE = 50;

export async function generateBlueprintsFromMongo({ uri, targetDir, createGuides = true }) {
  ensureDirectory(targetDir);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });

  try {
    await client.connect();
    const dbName = getDatabaseName(uri);
    const db = client.db(dbName);

    logger.section(`Connected to MongoDB database: ${db.databaseName}`);

    const collections = await db.listCollections().toArray();
    const filteredCollections = collections.filter(({ name }) => !name.startsWith('system.'));

    if (filteredCollections.length === 0) {
      logger.warning('No collections found to generate blueprints from.');
      return;
    }

    for (const collection of filteredCollections) {
      await generateBlueprintForCollection({
        db,
        collectionName: collection.name,
        targetDir,
        createGuides,
      });
    }

    logger.success(`Generated ${filteredCollections.length} blueprint file(s) in ${targetDir}`);
  } catch (error) {
    logger.error('Failed to generate blueprints', error);
    throw error;
  } finally {
    await client.close().catch(() => {});
  }
}

async function generateBlueprintForCollection({ db, collectionName, targetDir, createGuides }) {
  logger.step(`Analyzing collection: ${collectionName}`);
  try {
    const collection = db.collection(collectionName);
    const documents = await sampleCollectionDocuments(collection);
    const properties = buildProperties(collectionName, documents);

    const blueprint = createBlueprintPayload(collectionName, properties);
    const blueprintPath = path.join(targetDir, `${blueprint.identifier}.blueprint.json`);

    fs.writeFileSync(blueprintPath, JSON.stringify(blueprint, null, 2));
    logger.success(`Blueprint generated: ${blueprintPath}`);

    if (createGuides) {
      generateSdkGuide({ blueprint, documents, targetDir });
    }
  } catch (error) {
    logger.error(`Failed to process collection ${collectionName}`, error);
  }
}

function buildProperties(collectionName, documents) {
  const properties = {};
  let processedDocuments = 0;

  for (const doc of documents) {
    if (processedDocuments >= SAMPLE_SIZE) {
      break;
    }
    processedDocuments += 1;
    if (!doc || typeof doc !== 'object') continue;

    for (const [key, value] of Object.entries(doc)) {
      if (shouldSkipField(key) || properties[key]) continue;
      properties[key] = createPropertyDescriptor(key, value, collectionName);
    }
  }

  if (Object.keys(properties).length === 0) {
    logger.warning(
      `No properties detected for collection ${collectionName}. Generated blueprint will contain empty properties.`
    );
  }

  return properties;
}

function createPropertyDescriptor(key, sampleValue, collectionName) {
  const { normalizedValue, multi } = normalizeSampleValue(sampleValue);
  const type = detectBlueprintType(normalizedValue);

  const descriptor = {
    title: formatTitle(key),
    type,
    description: '',
    required: false
  };

  if (multi) {
    descriptor.multi = true;
  }

  if (type === 'object') {
    descriptor.schema = buildObjectSchema(normalizedValue);
  }

  return descriptor;
}

function normalizeSampleValue(value) {
  if (Array.isArray(value)) {
    const firstValue = value.find((item) => item !== null && item !== undefined);
    return { normalizedValue: firstValue ?? null, multi: true };
  }

  return { normalizedValue: value, multi: false };
}

function createBlueprintPayload(collectionName, properties) {
  const singularName = ensureSingular(collectionName);
  return {
    identifier: toIdentifier(singularName),
    name: formatTitle(singularName),
    description: `Auto-generated blueprint for MongoDB collection "${collectionName}"`,
    entityIdentifierMechanism: 'objectid',
    permissions: createDefaultPermissions(),
    permissionScope: 'workspace',
    properties,
    relations: [],
    dispatchers: {
      create: false,
      update: false,
      delete: false
    },
    limitations: []
  };
}

function createDefaultPermissions() {
  const operations = ['create', 'read', 'update', 'delete'];
  return operations.map((operation) => ({
    scope: 'workspace',
    operation,
    guest: false,
    roleBased: ['*'],
    workspaceRoleBased: ['*'],
    workspaceLabelsBased: ['*']
  }));
}

async function sampleCollectionDocuments(collection) {
  try {
    return await collection.aggregate([{ $sample: { size: SAMPLE_SIZE } }]).toArray();
  } catch (error) {
    logger.debug(`Falling back to sequential sampling for ${collection.collectionName}: ${error.message}`);
    return collection.find({}).limit(SAMPLE_SIZE).toArray();
  }
}

function buildObjectSchema(sample, depth = 0) {
  const MAX_SCHEMA_DEPTH = 3;
  if (!sample || typeof sample !== 'object' || depth >= MAX_SCHEMA_DEPTH) {
    return { type: 'object' };
  }

  const properties = {};

  for (const [key, value] of Object.entries(sample)) {
    if (key === '_id' || value === undefined) continue;
    properties[key] = buildSchemaFromValue(value, depth + 1);
  }

  if (Object.keys(properties).length === 0) {
    return { type: 'object' };
  }

  return {
    type: 'object',
    properties
  };
}

function buildSchemaFromValue(value, depth) {
  if (Array.isArray(value)) {
    const arraySample = value.find((item) => item !== null && item !== undefined);
    const itemsSchema = arraySample ? buildSchemaFromValue(arraySample, depth + 1) : { type: 'string' };
    return {
      type: 'array',
      items: itemsSchema
    };
  }

  const valueType = detectBlueprintType(value);

  if (valueType === 'object' && value && typeof value === 'object') {
    return buildObjectSchema(value, depth + 1);
  }

  return {
    type: mapBlueprintTypeToJsonSchema(valueType)
  };
}

function shouldSkipField(key) {
  if (!key) return true;
  const normalized = key.toLowerCase();
  if (
    normalized === '_id' ||
    normalized === 'id' ||
    normalized === 'user' ||
    normalized === 'userid' ||
    normalized === 'workspace' ||
    normalized === 'workspaceid'
  ) {
    return true;
  }
  return key.startsWith('__');
}

function ensureDirectory(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    logger.info(`Created output directory at ${targetDir}`);
  }
}

function getDatabaseName(connectionUri) {
  try {
    const parsed = new URL(connectionUri);
    return parsed.pathname.replace(/^\//, '') || undefined;
  } catch {
    return undefined;
  }
}
