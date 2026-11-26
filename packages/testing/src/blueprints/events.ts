import type { Doc, MockState } from '../state/mock-state.js';
import { identifierOf, metadataOf, type BlueprintDoc } from '../routes/entities-query.js';

/**
 * The platform events a blueprint's `dispatchers` ask for, as `apps/no-code/server/controllers/entities.ts` emits
 * them. They are stored with the other events; no subscriber or integration runs.
 */

type Change = 'create' | 'update' | 'delete';
const DONE: Record<Change, string> = { create: 'created', update: 'updated', delete: 'deleted' };

const text = (value: unknown) => (value === undefined || value === null ? undefined : String(value));
const defined = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));

export function dispatch(state: MockState, blueprint: BlueprintDoc, change: Change, entity: Doc, extra: Record<string, unknown> = {}) {
  if (!blueprint.dispatchers?.[change]) return;
  state.events.insert({
    ...defined({ user: text(entity.user) }),
    tenant: state.settings.tenantId,
    source: 'blueprints',
    kind: blueprint.identifier,
    eventName: change,
    description: `${blueprint.name} ${DONE[change]}`,
    metadata: defined({ workspace: text(entity.workspace), entity: identifierOf(entity), blueprint: blueprint.identifier, ...extra }),
    created: new Date().toISOString(),
  });
}

/** what a stored entity's relations are indexed by */
const relationsOf = (entity: Doc, blueprint: BlueprintDoc) =>
  (blueprint.relations ?? []).flatMap(({ key }) => {
    const target = metadataOf(entity, blueprint)[key];
    return target ? [`${key}:${target}`] : [];
  });

/**
 * `modifiedFields` of an update event, as the database model lists them: every property of the entity, whether or not
 * its value changed, and the owners and relations only when they changed.
 */
export function modifiedFields(before: Doc, after: Doc, blueprint: BlueprintDoc): string[] {
  const owners = ['user', 'workspace']
    .filter((owner) => text(before[owner]) !== text(after[owner]))
    .flatMap((owner) => [owner, `${owner}.buffer`]);
  const properties = Object.keys(metadataOf(after, blueprint)).map((key) => `metadata.${key}`);
  const [was, is] = [relationsOf(before, blueprint), relationsOf(after, blueprint)];
  const relations = was.join('\n') === is.join('\n') ? [] : ['indexes', ...is.map((_, i) => `indexes.${i}`)];
  return [...owners, 'metadata', ...properties, ...relations];
}
