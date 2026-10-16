import { IBlueprint } from '@qelos/global-types';

/** Search by name, identifier, description, or any property's key, title or description. */
export function filterBlueprints(blueprints: IBlueprint[] | undefined, query: string | undefined): IBlueprint[] {
  const list = blueprints || [];
  const term = String(query ?? '').toLowerCase().trim();
  if (!term) return list;
  const has = (value: unknown) => typeof value === 'string' && value.toLowerCase().includes(term);
  return list.filter(
    (blueprint) =>
      has(blueprint.name) ||
      has(blueprint.identifier) ||
      has(blueprint.description) ||
      Object.entries(blueprint.properties || {}).some(([key, property]) => has(key) || has(property.title) || has(property.description)),
  );
}
