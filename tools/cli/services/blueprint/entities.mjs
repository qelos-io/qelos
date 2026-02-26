import fs from 'node:fs';
import { join } from 'node:path';
import { logger } from '../utils/logger.mjs';

const PAGE_SIZE = 1000;
const STRIP_KEYS = ['tenant', '__v', 'indexes', 'id'];

/**
 * Remove internal fields (tenant, __v) from an entity.
 */
function stripInternalFields(entity) {
  const result = { ...entity };
  for (const key of STRIP_KEYS) {
    delete result[key];
  }
  return result;
}

/**
 * Dump entities for a blueprint and save to paginated JSON files.
 * @param {Object} sdk - Initialized SDK instance
 * @param {Object} options
 * @param {string} options.blueprintName - Blueprint identifier
 * @param {string} options.targetPath - Base path for entities output (e.g. ./dump/entities)
 * @param {Object} [options.filter] - Filter params to pass to the query
 * @param {string} [options.group] - Key to group entities by
 * @param {Function|null} [options.resolveEntity] - Optional sync transform applied to each entity before writing
 */
export async function dumpBlueprintEntities(sdk, { blueprintName, targetPath, filter = {}, group, resolveEntity }) {
  const blueprintDir = join(targetPath, blueprintName);

  if (!fs.existsSync(blueprintDir)) {
    fs.mkdirSync(blueprintDir, { recursive: true });
  }

  const entityClient = sdk.blueprints.entitiesOf(blueprintName);

  if (group) {
    await dumpGrouped(entityClient, { blueprintDir, blueprintName, filter, group, resolveEntity });
  } else {
    await dumpPaginated(entityClient, { blueprintDir, blueprintName, filter, resolveEntity });
  }
}

/**
 * Fetch entities page by page and write each page to disk.
 */
async function dumpPaginated(entityClient, { blueprintDir, blueprintName, filter, resolveEntity }) {
  let page = 1;
  let totalEntities = 0;

  while (true) {
    const params = { $limit: PAGE_SIZE, $page: page, ...filter };
    const result = await entityClient.getList(params);
    let items = extractItems(result);

    if (items.length === 0) break;

    items = items.map(stripInternalFields);
    if (resolveEntity) {
      items = items.map(resolveEntity);
    }

    const fileName = `page-${page}.json`;
    const filePath = join(blueprintDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
    logger.step(`${blueprintName}: wrote ${fileName} (${items.length} entities)`);

    totalEntities += items.length;

    if (items.length < PAGE_SIZE) break;
    page++;
  }

  if (totalEntities === 0) {
    logger.warning(`${blueprintName}: no entities found`);
  } else {
    logger.success(`${blueprintName}: dumped ${totalEntities} entities across ${page} page(s)`);
  }
}

/**
 * Fetch all entities, group by key, then write paginated files per group.
 */
async function dumpGrouped(entityClient, { blueprintDir, blueprintName, filter, group, resolveEntity }) {
  const allEntities = [];
  let page = 1;

  while (true) {
    const params = { $limit: PAGE_SIZE, $page: page, ...filter };
    const result = await entityClient.getList(params);
    const items = extractItems(result);

    if (items.length === 0) break;
    allEntities.push(...items);

    if (items.length < PAGE_SIZE) break;
    page++;
  }

  if (allEntities.length === 0) {
    logger.warning(`${blueprintName}: no entities found`);
    return;
  }

  const stripped = allEntities.map(stripInternalFields);
  const resolved = resolveEntity ? stripped.map(resolveEntity) : stripped;

  // Group entities by the specified key
  const groups = {};
  for (const entity of resolved) {
    const value = resolveNestedKey(entity, group);
    const groupKey = value != null ? String(value) : '_ungrouped';
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(entity);
  }

  const groupKeys = Object.keys(groups);
  logger.info(`${blueprintName}: ${resolved.length} entities in ${groupKeys.length} group(s)`);

  for (const groupKey of groupKeys) {
    const entities = groups[groupKey];
    const safeGroupKey = sanitizeFileName(groupKey);
    const pages = chunkArray(entities, PAGE_SIZE);

    for (let i = 0; i < pages.length; i++) {
      const fileName = `${safeGroupKey}.page-${i + 1}.json`;
      const filePath = join(blueprintDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(pages[i], null, 2), 'utf-8');
      logger.step(`${blueprintName}: wrote ${fileName} (${pages[i].length} entities)`);
    }
  }

  logger.success(`${blueprintName}: dumped ${resolved.length} entities across ${groupKeys.length} group(s)`);
}

/**
 * Restore entities from local JSON files to a blueprint.
 * @param {Object} sdk - Initialized SDK instance
 * @param {Object} options
 * @param {string} options.blueprintName - Blueprint identifier
 * @param {string} options.targetPath - Base path for entities (e.g. ./dump/entities)
 * @param {string[]|null} [options.includePatterns] - Only push files whose name includes one of these values
 * @param {string[]|null} [options.excludePatterns] - Skip files whose name includes one of these values
 * @param {Object|null} [options.override] - Object to merge recursively into every entity
 * @param {boolean} [options.replace] - Replace local JSON files with API response data after push
 * @param {Function|null} [options.resolveEntity] - Optional async transform applied to each entity before create/update
 */
export async function restoreBlueprintEntities(sdk, { blueprintName, targetPath, includePatterns, excludePatterns, override, replace = false, resolveEntity }) {
  const blueprintDir = join(targetPath, blueprintName);

  if (!fs.existsSync(blueprintDir)) {
    logger.warning(`${blueprintName}: directory not found at ${blueprintDir}`);
    return;
  }

  // Collect JSON files, applying include/exclude filters
  let files = fs.readdirSync(blueprintDir).filter(f => f.endsWith('.json'));

  if (includePatterns) {
    files = files.filter(f => includePatterns.some(p => f.includes(p)));
  }
  if (excludePatterns) {
    files = files.filter(f => !excludePatterns.some(p => f.includes(p)));
  }

  if (files.length === 0) {
    logger.warning(`${blueprintName}: no matching JSON files found in ${blueprintDir}`);
    return;
  }

  logger.info(`${blueprintName}: found ${files.length} file(s) to restore`);

  const entityClient = sdk.blueprints.entitiesOf(blueprintName);
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = join(blueprintDir, file);
    let entities;
    try {
      entities = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      logger.error(`${blueprintName}: failed to parse ${file}`);
      failed++;
      continue;
    }

    if (!Array.isArray(entities)) {
      logger.warning(`${blueprintName}: ${file} is not an array, skipping`);
      continue;
    }

    logger.step(`${blueprintName}: restoring ${file} (${entities.length} entities)`);

    const responseEntities = replace ? [] : null;

    for (const entity of entities) {
      let data = override ? deepMerge(entity, override) : entity;
      if (resolveEntity) {
        data = await resolveEntity(data);
      }
      try {
        let result;
        if (data.identifier) {
          result = await entityClient.update(data.identifier, data);
          updated++;
        } else {
          result = await entityClient.create(data);
          created++;
        }
        if (responseEntities) responseEntities.push(result);
      } catch (error) {
        const id = data.identifier || '(new)';
        logger.error(`${blueprintName}: failed to restore entity ${id}: ${error.message}`);
        failed++;
        if (responseEntities) responseEntities.push(data);
      }
    }

    if (responseEntities) {
      fs.writeFileSync(filePath, JSON.stringify(responseEntities, null, 2), 'utf-8');
      logger.step(`${blueprintName}: replaced ${file} with API response data`);
    }
  }

  if (created + updated > 0) {
    logger.success(`${blueprintName}: created ${created}, updated ${updated}${failed ? `, failed ${failed}` : ''}`);
  } else if (failed > 0) {
    logger.error(`${blueprintName}: all ${failed} entities failed`);
  }
}

/**
 * Extract items array from SDK response (handles both array and { data: [] } shapes).
 */
function extractItems(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
}

/**
 * Resolve a potentially nested key (e.g. "metadata.status") from an object.
 */
function resolveNestedKey(obj, key) {
  return key.split('.').reduce((current, part) => current?.[part], obj);
}

/**
 * Sanitize a string for use as a filename.
 */
function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_').substring(0, 200);
}

/**
 * Split an array into chunks of the given size.
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Deep merge source into target. Source values override target values.
 * Arrays are replaced, not concatenated.
 */
export function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
