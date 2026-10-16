import type { Model } from 'mongoose';
import type { IBlueprint } from '../models/blueprint';
import BlueprintEntity, { IBlueprintEntity, LEGACY_ENTITIES_COLLECTION } from '../models/blueprint-entity';

type BlueprintStorageRef = Pick<IBlueprint, 'storage'> | null | undefined;

/**
 * The closed set of physical entities collections. Names come only from this registry, never from
 * tenant or blueprint input, so Mongo never gets unbounded dynamic collections.
 * To add one: register its model here (same schema), deploy so its indexes are built, then assign it.
 */
const ENTITY_MODELS = new Map<string, Model<IBlueprintEntity>>([
  [LEGACY_ENTITIES_COLLECTION, BlueprintEntity],
]);

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
