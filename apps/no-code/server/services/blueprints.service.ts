import { cacheManager } from './cache-manager';
import Blueprint, { IBlueprint } from '../models/blueprint';

export function getBlueprintCacheKey(tenant: string, identifier: string) {
  return `blueprint:${tenant}:${identifier}`;
}

// `null` is what a removed blueprint's cache entry is overwritten with (there is no delete on the cache manager).
// A missing blueprint is never cached: creating it later must be visible right away.
const EMPTY = 'null';

export function evictBlueprintCache(tenant: string, identifier: string) {
  return cacheManager.setItem(getBlueprintCacheKey(tenant, identifier), EMPTY).catch(() => undefined);
}

export async function getBlueprint(tenant: string, identifier: string): Promise<IBlueprint> {
  const key = getBlueprintCacheKey(tenant, identifier);
  let cached: string | undefined;
  try {
    cached = await cacheManager.getItem(key);
  } catch {
    // cache provider is down, read from the database
  }
  if (cached && cached !== EMPTY) {
    return JSON.parse(cached);
  }
  const blueprint = await Blueprint
    .findOne({ tenant, identifier })
    .lean()
    .exec()
  if (!blueprint) {
    return null as any;
  }
  const blueprintJson = JSON.stringify(blueprint);
  cacheManager.setItem(key, blueprintJson).catch(() => console.warn('could not set value on cache provider', key));
  return JSON.parse(blueprintJson);
}
