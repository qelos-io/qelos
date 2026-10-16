// Pure rules for admin-indexed properties (no database access, so it can be unit tested in isolation).
// The actual index building lives in entity-index-sync.service.
import { createHash } from 'node:crypto';
import { BlueprintPropertyType, IBlueprintPropertyDescriptor } from '@qelos/global-types';
import type { IBlueprint } from '../models/blueprint';

/** how many properties of one blueprint an admin can mark `indexed` */
export const MAX_INDEXED_PROPERTIES = 5;

/**
 * Mongo allows 64 indexes per collection. The base indexes plus every blueprint sharing the collection
 * draw from the same budget, so stop well before the hard limit instead of failing mid-build.
 */
export const MAX_INDEXES_PER_COLLECTION = 60;

export const INDEX_NAME_PREFIX = 'ix_';
const NOT_INDEXABLE_TYPES: string[] = [BlueprintPropertyType.OBJECT, BlueprintPropertyType.FILE];

type Properties = Record<string, IBlueprintPropertyDescriptor> | undefined;
export type IndexState = NonNullable<NonNullable<IBlueprint['storage']>['indexes']>[string];

export function isIndexable(key: string, property: IBlueprintPropertyDescriptor | undefined): boolean {
  // the key becomes a field path: dots or a leading `$` would address something else
  return !!property?.indexed && !NOT_INDEXABLE_TYPES.includes(property.type) && !key.includes('.') && !key.startsWith('$');
}

export function getIndexedKeys(properties: Properties): string[] {
  return Object.entries(properties || {}).filter(([key, property]) => isIndexable(key, property)).map(([key]) => key).sort();
}

/** short and deterministic: avoids index name length limits and needs no escaping of user-defined keys */
export function getIndexName(tenant: string, blueprintIdentifier: string, key: string): string {
  return INDEX_NAME_PREFIX + createHash('sha1').update(`${tenant}:${blueprintIdentifier}:${key}`).digest('hex').slice(0, 20);
}

/** a message for the admin when the requested `indexed` flags are not allowed, otherwise null */
export function getIndexedPropertiesError(properties: Properties): string | null {
  const flagged = Object.entries(properties || {}).filter(([, property]) => property?.indexed);
  const invalid = flagged.find(([key, property]) => !isIndexable(key, property));
  if (invalid) {
    return `property "${invalid[0]}" cannot be indexed (objects, files and keys with "." or a leading "$" are not supported)`;
  }
  if (flagged.length > MAX_INDEXED_PROPERTIES) {
    return `at most ${MAX_INDEXED_PROPERTIES} properties of a blueprint can be indexed`;
  }
  return null;
}

export function hasIndexedKeysChanged(before: Properties, after: Properties, storage?: IBlueprint['storage']): boolean {
  const a = getIndexedKeys(before);
  const b = getIndexedKeys(after);
  const hasFailed = Object.values(storage?.indexes || {}).some(state => state.state === 'failed');
  return hasFailed || a.length !== b.length || a.some((key, i) => key !== b[i]);
}
