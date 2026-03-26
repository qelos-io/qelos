import fs from 'node:fs';
import { join } from 'node:path';
import { logger } from '../utils/logger.mjs';
import { deepMerge } from './entities.mjs';

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function isObjectId(value) {
  return typeof value === 'string' && OBJECT_ID_RE.test(value);
}

/**
 * Fetch all blueprint definitions from the target environment and extract relations.
 * Returns a map: { blueprintIdentifier: [{ key, target }] }
 */
async function loadBlueprintRelations(sdk) {
  const blueprints = await sdk.manageBlueprints.getList();
  const relationsMap = {};

  for (const bp of blueprints) {
    const full = await sdk.manageBlueprints.getBlueprint(bp.identifier);
    relationsMap[bp.identifier] = (full.relations || []).map(r => ({
      key: r.key,
      target: r.target,
    }));
  }

  return relationsMap;
}

/**
 * Topological sort of blueprint names based on their relation dependencies.
 * Blueprints that are depended upon come first.
 * Handles cycles by breaking them and logging a warning.
 */
export function buildDependencyOrder(blueprintNames, relationsMap) {
  const nameSet = new Set(blueprintNames);
  const graph = new Map(); // blueprint -> set of blueprints it depends on
  const reverseGraph = new Map(); // blueprint -> set of blueprints that depend on it

  for (const name of blueprintNames) {
    graph.set(name, new Set());
    reverseGraph.set(name, new Set());
  }

  for (const name of blueprintNames) {
    const relations = relationsMap[name] || [];
    for (const rel of relations) {
      if (nameSet.has(rel.target) && rel.target !== name) {
        // 'name' depends on 'rel.target' (target must be restored first)
        graph.get(name).add(rel.target);
        reverseGraph.get(rel.target).add(name);
      }
    }
  }

  // Kahn's algorithm
  const sorted = [];
  const queue = [];

  for (const name of blueprintNames) {
    if (graph.get(name).size === 0) {
      queue.push(name);
    }
  }

  while (queue.length > 0) {
    const node = queue.shift();
    sorted.push(node);
    for (const dependent of (reverseGraph.get(node) || [])) {
      graph.get(dependent).delete(node);
      if (graph.get(dependent).size === 0) {
        queue.push(dependent);
      }
    }
  }

  // Handle cycles - add remaining nodes with a warning
  const remaining = blueprintNames.filter(n => !sorted.includes(n));
  if (remaining.length > 0) {
    logger.warning(`Circular dependencies detected among: ${remaining.join(', ')}. These will be restored last (some relations may not resolve).`);
    sorted.push(...remaining);
  }

  return sorted;
}

/**
 * Read all entity data from dump files for a given blueprint.
 * Returns array of entities with their source file info.
 */
export function readBlueprintEntities(entitiesBasePath, blueprintName, includePatterns, excludePatterns) {
  const blueprintDir = join(entitiesBasePath, blueprintName);

  if (!fs.existsSync(blueprintDir)) {
    return [];
  }

  let files = fs.readdirSync(blueprintDir).filter(f => f.endsWith('.json'));

  if (includePatterns) {
    files = files.filter(f => includePatterns.some(p => f.includes(p)));
  }
  if (excludePatterns) {
    files = files.filter(f => !excludePatterns.some(p => f.includes(p)));
  }

  const allEntities = [];
  for (const file of files) {
    const filePath = join(blueprintDir, file);
    try {
      const entities = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(entities)) {
        for (const entity of entities) {
          allEntities.push({ ...entity, _sourceFile: file });
        }
      }
    } catch {
      logger.error(`${blueprintName}: failed to parse ${file}`);
    }
  }

  return allEntities;
}

/**
 * Replace relation fields in entity metadata using the old→new ID map.
 * Handles both single values and arrays.
 */
export function remapRelations(entity, relations, idMap) {
  if (!entity.metadata || relations.length === 0) return entity;

  const remapped = { ...entity, metadata: { ...entity.metadata } };

  for (const rel of relations) {
    const value = remapped.metadata[rel.key];
    if (value == null) continue;

    if (Array.isArray(value)) {
      remapped.metadata[rel.key] = value.map(v => {
        if (isObjectId(v) && idMap.has(v)) {
          logger.debug(`  Remapped ${rel.key}[] ${v} → ${idMap.get(v)}`);
          return idMap.get(v);
        }
        return v;
      });
    } else if (isObjectId(value) && idMap.has(value)) {
      logger.debug(`  Remapped ${rel.key} ${value} → ${idMap.get(value)}`);
      remapped.metadata[rel.key] = idMap.get(value);
    }
  }

  return remapped;
}

/**
 * Clone-restore all blueprints to a new environment.
 *
 * This handles:
 * 1. Verifying users.json exists & workspaces.json if entities use workspaces
 * 2. Fetching blueprint definitions to understand relations
 * 3. Topologically sorting blueprints by dependency order
 * 4. Restoring entities in order, remapping all IDs (old env → new env)
 * 5. Resolving user/workspace references via the identity resolver
 */
export async function cloneRestoreBlueprints(sdk, {
  blueprintNames,
  entitiesBasePath,
  dumpPath,
  includePatterns,
  excludePatterns,
  override,
  resolveEntity,
}) {
  // 1. Verify users.json exists; workspaces.json is only required when entities use workspaces
  const usersFile = join(dumpPath, 'users.json');
  const workspacesFile = join(dumpPath, 'workspaces.json');

  if (!fs.existsSync(usersFile)) {
    logger.error(`Clone mode requires users dump. File not found: ${usersFile}`);
    logger.info('Run "qelos dump users" against the source environment first.');
    process.exit(1);
  }

  // Check if any entities in the dump have a workspace property
  const hasWorkspaceEntities = blueprintNames.some(name => {
    const entities = readBlueprintEntities(entitiesBasePath, name, includePatterns, excludePatterns);
    return entities.some(e => !!e.workspace);
  });

  if (hasWorkspaceEntities && !fs.existsSync(workspacesFile)) {
    logger.error(`Clone mode requires workspaces dump. File not found: ${workspacesFile}`);
    logger.info('Run "qelos dump workspaces" against the source environment first.');
    process.exit(1);
  }
  if (!hasWorkspaceEntities && !fs.existsSync(workspacesFile)) {
    logger.debug('No workspace properties found on entities — skipping workspaces verification');
  }

  logger.section('Clone mode: restoring all data to new environment');

  // 2. Load blueprint relations from target environment
  logger.step('Fetching blueprint definitions from target environment...');
  const relationsMap = await loadBlueprintRelations(sdk);

  const knownBlueprints = Object.keys(relationsMap);
  logger.info(`Found ${knownBlueprints.length} blueprint definition(s) in target`);

  // Log relations for debugging
  for (const [bp, rels] of Object.entries(relationsMap)) {
    if (rels.length > 0) {
      logger.debug(`  ${bp} → ${rels.map(r => `${r.key}:${r.target}`).join(', ')}`);
    }
  }

  // 3. Determine dependency order
  const sortedBlueprints = buildDependencyOrder(blueprintNames, relationsMap);
  logger.info(`Restore order: ${sortedBlueprints.join(' → ')}`);

  // 4. Restore in order with ID remapping
  const idMap = new Map(); // old _id → new _id (across all blueprints)
  let totalCreated = 0;
  let totalFailed = 0;

  for (const blueprintName of sortedBlueprints) {
    logger.section(`Cloning entities for: ${blueprintName}`);

    const entities = readBlueprintEntities(entitiesBasePath, blueprintName, includePatterns, excludePatterns);

    if (entities.length === 0) {
      logger.warning(`${blueprintName}: no entities found to clone`);
      continue;
    }

    logger.info(`${blueprintName}: ${entities.length} entities to clone`);

    const entityClient = sdk.blueprints.entitiesOf(blueprintName);
    const relations = relationsMap[blueprintName] || [];
    let created = 0;
    let failed = 0;

    for (const rawEntity of entities) {
      // Remove source tracking field
      const { _sourceFile, ...entityData } = rawEntity;

      // Keep old _id for mapping, but don't send it to API
      const oldId = entityData._id;

      // Strip fields that would cause conflicts in new env
      let data = { ...entityData };
      delete data._id;
      delete data.identifier;

      // Apply override
      if (override) {
        data = deepMerge(data, override);
      }

      // Ensure _id and identifier stay stripped even if override re-introduced them
      delete data._id;
      delete data.identifier;

      // Remap relation fields using already-restored entity IDs
      data = remapRelations(data, relations, idMap);

      try {
        // Resolve user/workspace references
        if (resolveEntity) {
          data = await resolveEntity(data);
        }

        const result = await entityClient.create(data);
        created++;

        // Record ID mapping for downstream blueprints
        if (oldId && result._id) {
          idMap.set(oldId, result._id);
        }
      } catch (error) {
        logger.error(`${blueprintName}: failed to create entity: ${error.message}`);
        failed++;
      }
    }

    if (created > 0) {
      logger.success(`${blueprintName}: cloned ${created} entities${failed ? `, failed ${failed}` : ''}`);
    } else if (failed > 0) {
      logger.error(`${blueprintName}: all ${failed} entities failed`);
    }

    totalCreated += created;
    totalFailed += failed;
  }

  logger.section('Clone restore summary');
  logger.success(`Total: ${totalCreated} entities created across ${sortedBlueprints.length} blueprint(s)${totalFailed ? `, ${totalFailed} failed` : ''}`);
  logger.info(`ID mappings tracked: ${idMap.size}`);
}
