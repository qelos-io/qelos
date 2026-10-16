import Blueprint, { IBlueprint } from '../models/blueprint';
import { getEntityModel } from './entity-storage.service';
import { evictBlueprintCache } from './blueprints.service';
import {
  INDEX_NAME_PREFIX,
  IndexState,
  MAX_INDEXES_PER_COLLECTION,
  getIndexName,
  getIndexedKeys,
} from './entity-indexes.service';
import logger from './logger';

// one sync at a time per blueprint (in this process), so a quick second save cannot interleave with the first
const running = new Map<string, Promise<void>>();

/**
 * Makes the blueprint's partial indexes match its `indexed` properties, without blocking the request that
 * changed them. Each index covers only this tenant's blueprint, so unflagged blueprints pay nothing and the
 * index stays small; it serves equality/range filters and sorting on the property (then `created`).
 * Progress and failures are written to `blueprint.storage.indexes`; a later save of the blueprint retries failures.
 */
export function scheduleEntityIndexSync(blueprint: Pick<IBlueprint, 'tenant' | 'identifier' | 'properties' | 'storage'>) {
  const snapshot = { tenant: blueprint.tenant, identifier: blueprint.identifier, properties: blueprint.properties, storage: blueprint.storage };
  const lockKey = `${snapshot.tenant}:${snapshot.identifier}`;
  const previous = running.get(lockKey) || Promise.resolve();
  const next = previous
    .then(() => syncEntityIndexes(snapshot))
    .catch(err => logger.error('entity index sync failed', lockKey, err))
    .finally(() => {
      if (running.get(lockKey) === next) {
        running.delete(lockKey);
      }
    });
  running.set(lockKey, next);
  return next;
}

export async function syncEntityIndexes(blueprint: Pick<IBlueprint, 'tenant' | 'identifier' | 'properties' | 'storage'>) {
  const { tenant, identifier } = blueprint;
  const collection = getEntityModel(blueprint).collection;
  const filter = { tenant, blueprint: identifier };

  const desired = new Map(getIndexedKeys(blueprint.properties).map(key => [getIndexName(tenant, identifier, key), key]));
  let indexes = await collection.indexes();
  const ours = indexes.filter(index => index.name?.startsWith(INDEX_NAME_PREFIX)
    && index.partialFilterExpression?.tenant === tenant
    && index.partialFilterExpression?.blueprint === identifier);

  for (const index of ours) {
    if (!desired.has(index.name!)) {
      await collection.dropIndex(index.name!).catch(err => logger.error('could not drop index', index.name, err));
    }
  }

  const state: Record<string, IndexState> = {};
  const toBuild: [string, string][] = [];
  for (const [name, key] of desired) {
    if (ours.some(index => index.name === name)) {
      state[key] = { state: 'ready', name };
    } else {
      state[key] = { state: 'building', name };
      toBuild.push([name, key]);
    }
  }
  await saveIndexState(blueprint, state);

  for (const [name, key] of toBuild) {
    indexes = await collection.indexes();
    if (indexes.length >= MAX_INDEXES_PER_COLLECTION) {
      state[key] = { state: 'failed', name, error: 'index budget of the collection is exhausted' };
      continue;
    }
    try {
      await collection.createIndex({ [`metadata.${key}`]: 1, created: -1 }, { name, partialFilterExpression: filter });
      state[key] = { state: 'ready', name };
    } catch (err: any) {
      logger.error('could not build index', name, err);
      state[key] = { state: 'failed', name, error: String(err?.message || err).slice(0, 200) };
    }
    await saveIndexState(blueprint, state);
  }
}

async function saveIndexState(blueprint: { tenant: string, identifier: string }, state: Record<string, IndexState>) {
  // updateOne, not save(): never overwrite whatever the admin changed meanwhile
  await Blueprint.updateOne(
    { tenant: blueprint.tenant, identifier: blueprint.identifier },
    { $set: { 'storage.indexes': state } },
  ).exec();
  await evictBlueprintCache(blueprint.tenant, blueprint.identifier);
}
