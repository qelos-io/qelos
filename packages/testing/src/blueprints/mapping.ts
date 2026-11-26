import { accessSync, constants } from 'node:fs';
import { createRequire } from 'node:module';
import { delimiter, dirname, join } from 'node:path';
import { MockHttpError } from '../router/router.js';
import type { Doc } from '../state/mock-state.js';
import { validateValue, type BlueprintDoc, type ValueChecks } from '../routes/entities-query.js';

/**
 * A blueprint's `updateMapping`: properties calculated with `jq` whenever an entity is saved, following
 * `updateEntityMapping` of `apps/no-code`. It runs with `node-jq`, as the service does, when the app has it installed.
 */

export type Jq = (filter: string, input: unknown) => Promise<unknown>;

/** a name TypeScript does not resolve: the package is optional */
const PACKAGE: string = 'node-jq';

/** where this module is: the CommonJS build knows, the ES module build reads it off a stack */
const here = (): string | undefined =>
  typeof __filename === 'string' ? __filename : new Error().stack?.match(/\(?((?:file:\/\/)?(?:\/|[A-Za-z]:\\)[^()]*?):\d+:\d+/)?.[1];

/** the `jq` program `node-jq` starts, found the way it finds it */
export function jqProgram(): string | undefined {
  const given = process.env.JQ_PATH || process.env.npm_config_jq_path;
  if (given) return given;
  for (const from of [here(), join(process.cwd(), 'package.json')]) {
    try {
      return join(dirname(createRequire(from!).resolve(PACKAGE)), '..', 'bin', 'jq');
    } catch {}
  }
  return undefined;
}

const runnable = (file: string) => {
  try {
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Why `jq` cannot be started, or undefined when it can. Checked before the first call, because `node-jq` does not
 * handle a program that fails to start: that ends the whole process.
 */
function programRefusal(program: string | undefined): string | undefined {
  if (!program) return 'Its jq program could not be located.';
  const names = process.platform === 'win32' ? [program, `${program}.exe`] : [program];
  // a bare name is looked up on the PATH
  const places = /[\\/]/.test(program)
    ? names
    : (process.env.PATH ?? '').split(delimiter).flatMap((folder) => names.map((name) => join(folder, name)));
  if (places.some(runnable)) return undefined;
  return `Its jq program is missing (${program}). Allow the install script of node-jq: in pnpm, "pnpm approve-builds".`;
}

/** Loads `node-jq` once, when first needed. Without it, warns once and answers undefined. */
export function createJqLoader(
  warn: (message: string) => void,
  load: () => Promise<any> = () => import(PACKAGE),
  locate: () => string | undefined = jqProgram,
) {
  let loading: Promise<Jq | undefined> | undefined;
  return () =>
    (loading ??= (async () => {
      try {
        const loaded = await load();
        const refusal = programRefusal(locate());
        if (refusal) throw new Error(refusal);
        const jq = loaded.run ? loaded : loaded.default;
        const run: Jq = (filter, input) => jq.run(filter, input, { input: 'json', output: 'json' });
        // make sure it works before relying on it
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
  checks: ValueChecks & { failure: string },
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
        throw new MockHttpError(500, checks.failure);
      }
    }),
  );
  for (const [key, result] of results) {
    const property = blueprint.properties?.[key];
    if (!property) throw new MockHttpError(400, `Property ${key} not found in blueprint ${blueprint.identifier}`);
    const value = validateValue(key, result, property, checks);
    if (value === undefined) delete entity.metadata[key];
    else entity.metadata[key] = value;
  }
}
