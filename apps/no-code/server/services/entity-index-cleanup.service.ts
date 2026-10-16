import { getAllEntityModels } from './entity-storage.service';
import logger from './logger';

/**
 * Indexes the schema no longer defines. Mongoose creates missing indexes but never drops old ones, so without this
 * they would stay on every entity collection and keep costing writes. Add a line when an index is replaced.
 */
export const OBSOLETE_ENTITY_INDEXES = [
  // relation lookups always filter by blueprint too
  { name: 'tenant_1_indexes_1', replacedBy: 'tenant_1_blueprint_1_indexes_1' },
];

/** an obsolete index is dropped only when its replacement is already there, so queries are never left without one */
export function getDroppableIndexes(existing: string[]): string[] {
  return OBSOLETE_ENTITY_INDEXES
    .filter(({ name, replacedBy }) => existing.includes(name) && existing.includes(replacedBy))
    .map(({ name }) => name);
}

/**
 * Run once at startup, in the background. Safe with several instances starting together (dropping an index that
 * is already gone is ignored) and with a rolling deploy (the replacement serves every query the old one did).
 */
export async function dropObsoleteEntityIndexes() {
  for (const model of getAllEntityModels()) {
    try {
      // resolves once the schema's own indexes (including the replacement) are built
      await model.init();
      const existing = (await model.collection.indexes()).map(index => index.name!);
      for (const name of getDroppableIndexes(existing)) {
        try {
          await model.collection.dropIndex(name);
          logger.log(`dropped obsolete index ${name} on ${model.collection.name}`);
        } catch (err: any) {
          if (err?.codeName !== 'IndexNotFound' && err?.code !== 27) {
            throw err;
          }
        }
      }
    } catch (err) {
      logger.error('could not drop obsolete indexes of', model.collection.name, err);
    }
  }
}
