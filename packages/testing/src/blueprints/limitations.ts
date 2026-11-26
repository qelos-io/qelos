import type { MockActor } from '../routes/actor.js';
import type { Doc } from '../state/mock-state.js';

/** A blueprint's `limitations`, following `hasReachedLimitations` of `apps/no-code/server/controllers/entities.ts`. */

export interface Limitation {
  scope: string;
  value: number;
  /** only callers with one of these roles are limited */
  roles?: string[];
  /** only workspaces with one of these labels are limited; a caller without a workspace is refused */
  workspaceLabels?: string[];
  /** count only entities with the same values of these properties */
  properties?: string[];
}

/** equality as the database counts it: a missing value equals `null`, and a list holds its items */
function same(stored: unknown, wanted: unknown): boolean {
  const json = (value: unknown) => JSON.stringify(value ?? null);
  return json(stored) === json(wanted) || (Array.isArray(stored) && !Array.isArray(wanted) && stored.some((item) => json(item) === json(wanted)));
}

/** whether the new entity would be one more than some limitation allows */
export function reachedLimit(
  limitations: Limitation[],
  actor: MockActor,
  entity: { user?: unknown; workspace?: unknown; metadata: Record<string, unknown> },
  existing: Doc[],
  metadataOf: (other: Doc) => Record<string, unknown>,
): boolean {
  return limitations.some(({ scope, value, roles, workspaceLabels, properties }) => {
    if (roles?.length && !roles.includes('*') && !actor.roles.some((role) => roles.includes(role))) return false;
    if (workspaceLabels?.length && !workspaceLabels.includes('*')) {
      if (!actor.workspace) return true;
      if (!workspaceLabels.some((label) => actor.workspace!.labels?.includes(label))) return false;
    }
    const owner = scope === 'workspace' ? 'workspace' : scope === 'user' ? 'user' : undefined;
    const counted = existing.filter(
      (other) =>
        (!owner || String(other[owner] ?? '') === String(entity[owner] ?? '')) &&
        (properties ?? []).every((name) => same(metadataOf(other)[name], entity.metadata[name])),
    );
    return counted.length >= value;
  });
}
