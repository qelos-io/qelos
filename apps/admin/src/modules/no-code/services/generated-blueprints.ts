import { IBlueprint } from '@qelos/global-types';
import { describeProperty, propertyRows } from './blueprint-editor';

export interface GeneratedReviewRow {
  index: number;
  identifier: string;
  name: string;
  description: string;
  properties: { key: string; title: string; typeLabel: string; required: boolean; description: string }[];
  links: { key: string; target: string }[];
  /** a blueprint with this identifier is already in the app */
  exists: boolean;
}

/** What the review step shows for each blueprint the AI drafted. */
export function toReviewRows(generated: Partial<IBlueprint>[], existingIdentifiers: string[]): GeneratedReviewRow[] {
  const existing = new Set(existingIdentifiers);
  return generated.map((blueprint, index) => ({
    index,
    identifier: String(blueprint.identifier ?? ''),
    name: String(blueprint.name || blueprint.identifier || ''),
    description: String(blueprint.description ?? ''),
    properties: propertyRows(blueprint.properties).map((row) => ({
      key: row.key,
      title: row.title || row.key,
      typeLabel: describeProperty(row).typeLabel,
      required: !!row.required,
      description: row.description || '',
    })),
    links: (blueprint.relations || []).map((relation) => ({ key: relation.key, target: relation.target })),
    exists: existing.has(String(blueprint.identifier ?? '')),
  }));
}

/** Blueprints that are linked to come first, so a failed batch never leaves a link pointing at nothing. */
export function creationOrder(generated: Partial<IBlueprint>[], selected: number[]): Partial<IBlueprint>[] {
  const chosen = selected.map((index) => generated[index]).filter(Boolean);
  const pending = new Map(chosen.map((blueprint) => [blueprint.identifier as string, blueprint]));
  const ordered: Partial<IBlueprint>[] = [];
  const visiting = new Set<string>();

  const visit = (blueprint: Partial<IBlueprint>) => {
    const id = blueprint.identifier as string;
    if (!pending.has(id) || visiting.has(id)) return;
    visiting.add(id);
    for (const relation of blueprint.relations || []) {
      const target = pending.get(relation.target);
      if (target && target !== blueprint) visit(target);
    }
    pending.delete(id);
    ordered.push(blueprint);
  };
  chosen.forEach(visit);
  return ordered;
}

/** Drops links to blueprints that will not exist (unselected ones the app does not already have). */
export function withoutDanglingLinks(blueprints: Partial<IBlueprint>[], existingIdentifiers: string[]): Partial<IBlueprint>[] {
  const known = new Set([...existingIdentifiers, ...blueprints.map((blueprint) => blueprint.identifier as string)]);
  return blueprints.map((blueprint) => ({
    ...blueprint,
    relations: (blueprint.relations || []).filter((relation) => known.has(relation.target)),
  }));
}
