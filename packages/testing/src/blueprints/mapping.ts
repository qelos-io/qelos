import { MockHttpError } from '../router/router.js';
import type { Doc } from '../state/mock-state.js';
import { validateValue, type BlueprintDoc } from '../routes/entities-query.js';

/**
 * A blueprint's `updateMapping`: properties calculated with `jq` whenever an entity is saved, following
 * `updateEntityMapping` of `apps/no-code`. It runs with `node-jq`, as the service does, when the app has it installed.
 */

export type Jq = (filter: string, input: unknown) => Promise<unknown>;

/** a name TypeScript does not resolve: the package is optional */
const PACKAGE: string = 'node-jq';

/** Loads `node-jq` once, when first needed. Without it, warns once and answers undefined. */
export function createJqLoader(warn: (message: string) => void, load: () => Promise<any> = () => import(PACKAGE)) {
  let loading: Promise<Jq | undefined> | undefined;
  return () =>
    (loading ??= (async () => {
      try {
        const loaded = await load();
        const jq = loaded.run ? loaded : loaded.default;
        const run: Jq = (filter, input) => jq.run(filter, input, { input: 'json', output: 'json' });
        // installing the package downloads the jq program: make sure it is there
        await run('.', {});
        return run;
      } catch (e: any) {
        warn(
          `[qelos-testing] blueprint "updateMapping" is not applied: it needs the optional "node-jq" package ` +
            `(npm install --save-dev node-jq). ${String(e?.message ?? e).split('\n')[0]}`,
        );
        return undefined;
      }
    })());
}

/** Calculate the mapped properties of `entity` and set them in its metadata. */
export async function applyUpdateMapping(
  blueprint: BlueprintDoc,
  entity: Doc & { metadata: Record<string, unknown> },
  loadJq: () => Promise<Jq | undefined>,
  failure: string,
): Promise<void> {
  const mapping = Object.entries(blueprint.updateMapping ?? {});
  if (!mapping.length) return;
  const jq = await loadJq();
  if (!jq) return;
  // every filter reads the entity, as JSON, as it is before any of them is applied
  const input = JSON.parse(JSON.stringify(entity));
  const results = await Promise.all(
    mapping.map(async ([key, filter]) => {
      try {
        return [key, await jq(filter, input)] as const;
      } catch {
        throw new MockHttpError(500, failure);
      }
    }),
  );
  for (const [key, result] of results) {
    const property = blueprint.properties?.[key];
    if (!property) throw new MockHttpError(400, `Property ${key} not found in blueprint ${blueprint.identifier}`);
    const value = validateValue(key, result, property);
    if (value === undefined) delete entity.metadata[key];
    else entity.metadata[key] = value;
  }
}
