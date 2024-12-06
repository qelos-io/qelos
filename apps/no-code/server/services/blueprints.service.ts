import { cacheManager } from './cache-manager';
import Blueprint, { IBlueprint } from '../models/blueprint';

export async function getBlueprint(tenant: string, identifier: string): Promise<IBlueprint> {
  const blueprintJson = await cacheManager.wrap(`blueprint:${tenant}:${identifier}`, async () => {
    const blueprint = await Blueprint
      .findOne({ tenant, identifier })
      .lean()
      .exec()
    return JSON.stringify(blueprint);
  })
  return JSON.parse(blueprintJson);
}