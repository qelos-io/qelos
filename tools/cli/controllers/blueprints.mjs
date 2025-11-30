import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { logger } from "../services/logger.mjs";

const SUPPORTED_PROTOCOL = /^mongodb:\/\//i;
const SAMPLE_SIZE = 50;

export default async function blueprintsController({ uri, path: targetPath }) {
  const connectionUri = uri || "mongodb://localhost:27017/db";

  if (!SUPPORTED_PROTOCOL.test(connectionUri)) {
    logger.error("Only mongodb:// URIs are supported at the moment.");
    process.exit(1);
  }

  const targetDir = path.join(process.cwd(), targetPath);
  ensureDirectory(targetDir);

  const client = new MongoClient(connectionUri, {
    serverSelectionTimeoutMS: 10_000,
  });

  try {
    await client.connect();
    const dbName = getDatabaseName(connectionUri);
    const db = client.db(dbName);

    logger.section(`Connected to MongoDB database: ${db.databaseName}`);

    const collections = await db.listCollections().toArray();
    const filteredCollections = collections.filter(
      (collection) => !collection.name.startsWith("system.")
    );

    if (filteredCollections.length === 0) {
      logger.warning("No collections found to generate blueprints from.");
      return;
    }

    for (const collection of filteredCollections) {
      await generateBlueprintForCollection(db, collection.name, targetDir);
    }

    logger.success(
      `Generated ${filteredCollections.length} blueprint file(s) in ${targetDir}`
    );
  } catch (error) {
    logger.error("Failed to generate blueprints", error);
    process.exit(1);
  } finally {
    await client.close().catch(() => {});
  }
}

function ensureDirectory(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    logger.info(`Created output directory at ${targetDir}`);
  }
}

async function generateBlueprintForCollection(db, collectionName, targetDir) {
  logger.step(`Analyzing collection: ${collectionName}`);
  try {
    const collection = db.collection(collectionName);
    const documents = await sampleCollectionDocuments(collection);
    const properties = buildProperties(collectionName, documents);

    const blueprint = createBlueprintPayload(collectionName, properties);
    const filePath = path.join(
      targetDir,
      `${blueprint.identifier}.blueprint.json`
    );

    fs.writeFileSync(filePath, JSON.stringify(blueprint, null, 2));
    logger.success(`Blueprint generated: ${filePath}`);
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
    if (!doc || typeof doc !== "object") continue;

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
    description: "",
    required: false,
  };

  if (multi) {
    descriptor.multi = true;
  }

  if (type === "object") {
    descriptor.schema = buildObjectSchema(normalizedValue);
  }

  return descriptor;
}

function normalizeSampleValue(value) {
  if (Array.isArray(value)) {
    const firstValue = value.find(
      (item) => item !== null && item !== undefined
    );
    return { normalizedValue: firstValue ?? null, multi: true };
  }

  return { normalizedValue: value, multi: false };
}

function detectBlueprintType(value) {
  if (value === null || value === undefined) {
    return "string";
  }

  if (value instanceof Date) {
    return "datetime";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "object") {
    if (value?._bsontype === "ObjectId") {
      return "string";
    }
    return "object";
  }

  return "string";
}

function createBlueprintPayload(collectionName, properties) {
  const singularName = ensureSingular(collectionName);
  return {
    identifier: toIdentifier(singularName),
    name: formatTitle(singularName),
    description: `Auto-generated blueprint for MongoDB collection "${collectionName}"`,
    entityIdentifierMechanism: "objectid",
    permissions: createDefaultPermissions(),
    permissionScope: "workspace",
    properties,
    relations: [],
    dispatchers: {
      create: false,
      update: false,
      delete: false,
    },
    limitations: [],
  };
}

function createDefaultPermissions() {
  const operations = ["create", "read", "update", "delete"];
  return operations.map((operation) => ({
    scope: "workspace",
    operation,
    guest: false,
    roleBased: ["*"],
    workspaceRoleBased: ["*"],
    workspaceLabelsBased: ["*"],
  }));
}

function toIdentifier(collectionName) {
  const sanitized = collectionName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitized || `collection_${Date.now()}`;
}

function formatTitle(value) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

async function sampleCollectionDocuments(collection) {
  try {
    return await collection
      .aggregate([{ $sample: { size: SAMPLE_SIZE } }])
      .toArray();
  } catch (error) {
    logger.debug(
      `Falling back to sequential sampling for ${collection.collectionName}: ${error.message}`
    );
    return collection.find({}).limit(SAMPLE_SIZE).toArray();
  }
}

function buildObjectSchema(sample, depth = 0) {
  const MAX_SCHEMA_DEPTH = 3;
  if (!sample || typeof sample !== "object" || depth >= MAX_SCHEMA_DEPTH) {
    return { type: "object" };
  }

  const properties = {};

  for (const [key, value] of Object.entries(sample)) {
    if (key === "_id" || value === undefined) continue;
    properties[key] = buildSchemaFromValue(value, depth + 1);
  }

  if (Object.keys(properties).length === 0) {
    return { type: "object" };
  }

  return {
    type: "object",
    properties,
  };
}

function buildSchemaFromValue(value, depth) {
  if (Array.isArray(value)) {
    const arraySample = value.find(
      (item) => item !== null && item !== undefined
    );
    const itemsSchema = arraySample
      ? buildSchemaFromValue(arraySample, depth + 1)
      : { type: "string" };
    return {
      type: "array",
      items: itemsSchema,
    };
  }

  const valueType = detectBlueprintType(value);

  if (valueType === "object" && value && typeof value === "object") {
    return buildObjectSchema(value, depth + 1);
  }

  return {
    type: mapBlueprintTypeToJsonSchema(valueType),
  };
}

function mapBlueprintTypeToJsonSchema(type) {
  switch (type) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    default:
      return "string";
  }
}

function shouldSkipField(key) {
  if (!key) return true;
  const normalized = key.toLowerCase();
  if (
    normalized === "_id" ||
    normalized === "id" ||
    normalized === "user" ||
    normalized === "userid" ||
    normalized === "workspace" ||
    normalized === "workspaceid"
  ) {
    return true;
  }
  return key.startsWith("__");
}

function ensureSingular(value = "") {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  if (lower.endsWith("ies")) {
    return normalized.slice(0, -3) + normalized.slice(-3).replace(/ies$/i, "y");
  }

  if (/(sses|xes|zes|ches|shes)$/i.test(lower)) {
    return normalized.slice(0, -2);
  }

  if (lower.endsWith("s") && !lower.endsWith("ss")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function getDatabaseName(connectionUri) {
  try {
    const parsed = new URL(connectionUri);
    return parsed.pathname.replace(/^\//, "") || undefined;
  } catch {
    return undefined;
  }
}
