import { createHash } from 'node:crypto';
import mongoose, { Model } from 'mongoose';
import type { IBlueprint } from '../models/blueprint';
import { isLogLikeBlueprint } from './entity-profile.service';
import BlueprintEntity, { BlueprintEntitySchema, IBlueprintEntity, LEGACY_ENTITIES_COLLECTION } from '../models/blueprint-entity';

type BlueprintStorageRef = Pick<IBlueprint, 'storage'> | null | undefined;

/**
 * New blueprints are spread over this many collections, by a hash of (tenant, blueprint).
 * Changing it only affects blueprints created afterwards; existing ones keep their stored collection.
 */
export const ENTITY_BUCKETS = 16;

export const getBucketCollectionName = (bucket: number) => `${LEGACY_ENTITIES_COLLECTION}_${String(bucket).padStart(2, '0')}`;

/**
 * Blueprints that look like logs (see entity-profile.service) go to these instead: same schema and indexes, so they
 * behave identically, but their write volume stays away from ordinary blueprints and they are stored compressed.
 */
export const ENTITY_LOG_COLLECTIONS = 4;

export const getLogCollectionName = (index: number) => `${LEGACY_ENTITIES_COLLECTION}_log_${index}`;

// applied when the collection is created (Mongoose autoCreate), so it only affects collections created from now on
const LOG_COLLECTION_OPTIONS = { storageEngine: { wiredTiger: { configString: 'block_compressor=zstd' } } };

/**
 * The closed set of physical entities collections: the legacy one, the buckets and the log collections. Names come only
 * from this registry, never from tenant or blueprint input, so Mongo never gets unbounded dynamic collections.
 * To add one: register its model here (same schema), deploy so its indexes are built, then assign it.
 */
const ENTITY_MODELS = new Map<string, Model<IBlueprintEntity>>([
  [LEGACY_ENTITIES_COLLECTION, BlueprintEntity],
  ...Array.from({ length: ENTITY_BUCKETS }, (_, bucket): [string, Model<IBlueprintEntity>] => {
    const name = getBucketCollectionName(bucket);
    return [name, mongoose.model<IBlueprintEntity>(name, BlueprintEntitySchema, name)];
  }),
  ...Array.from({ length: ENTITY_LOG_COLLECTIONS }, (_, index): [string, Model<IBlueprintEntity>] => {
    const name = getLogCollectionName(index);
    const schema = BlueprintEntitySchema.clone();
    schema.set('collectionOptions', LOG_COLLECTION_OPTIONS);
    return [name, mongoose.model<IBlueprintEntity>(name, schema, name)];
  }),
]);

const hashOf = (tenant: string, blueprintIdentifier: string) =>
  createHash('sha1').update(`${tenant}:${blueprintIdentifier}`).digest().readUInt32BE(0);

/**
 * The collection a NEW blueprint is assigned to: a log collection when its identifier or name looks like a log,
 * otherwise a bucket, in both cases by a hash of (tenant, blueprint). Stored on the blueprint row once and never
 * recomputed, so renaming or changing the counts above cannot move existing rows.
 *
 * FUTURE: an admin-approved migration may later move a blueprint to another collection (e.g. a mis-guessed one);
 * it would be a background job the admin accepts knowing it takes time, which is why this is decided only once.
 */
export function pickEntityCollection(tenant: string, blueprintIdentifier: string, blueprintName?: string): string {
  const hash = hashOf(tenant, blueprintIdentifier);
  return isLogLikeBlueprint(blueprintIdentifier, blueprintName)
    ? getLogCollectionName(hash % ENTITY_LOG_COLLECTIONS)
    : getBucketCollectionName(hash % ENTITY_BUCKETS);
}

/**
 * Resolves the model that stores the given blueprint's entities, from `blueprint.storage.collection`.
 * A blueprint without it uses the legacy collection.
 *
 * FUTURE: tenant admins may request a storage migration (e.g. to a "log", read-heavy, write-heavy,
 * no-index or many-index collection) executed as an internal background job. That is why the
 * collection is stored on the blueprint row and not computed from its name.
 */
export function getEntityModel(blueprint: BlueprintStorageRef): Model<IBlueprintEntity> {
  const name = blueprint?.storage?.collection || LEGACY_ENTITIES_COLLECTION;
  const model = ENTITY_MODELS.get(name);
  if (!model) {
    throw new Error(`unknown entities collection: ${name}`);
  }
  return model;
}

/** every physical entities model, for tenant-wide jobs (e.g. tenant removal) */
export function getAllEntityModels(): Model<IBlueprintEntity>[] {
  return Array.from(ENTITY_MODELS.values());
}
