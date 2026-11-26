import type {
  MockBlueprintSeed,
  MockPersonaSeed,
  MockPersonaWorkspaceSeed,
  MockSeed,
  MockWorkspaceSeed,
} from '../config/types.js';

let counter = 0;
const next = () => ++counter;

/** Restart the sequence used for generated names/emails, e.g. in a global `beforeEach`, for stable snapshots. */
export function resetFixtureSequence(): void {
  counter = 0;
}

/** A persona with a unique email, a password and the `user` role. Override anything. */
export function persona(overrides: Partial<MockPersonaSeed> = {}): MockPersonaSeed {
  const n = next();
  return {
    email: `user${n}@example.com`,
    password: 'password-123',
    name: `User ${n}`,
    roles: ['user'],
    ...overrides,
  };
}

/** A persona with the `admin` role. */
export function admin(overrides: Partial<MockPersonaSeed> = {}): MockPersonaSeed {
  const n = next();
  return persona({ email: `admin${n}@example.com`, name: `Admin ${n}`, roles: ['admin'], ...overrides });
}

/** A persona that is a member of a workspace (created on first use, matched by name). */
export function member(
  workspace: string | MockPersonaWorkspaceSeed,
  overrides: Partial<MockPersonaSeed> = {},
): MockPersonaSeed {
  const ws = typeof workspace === 'string' ? { name: workspace } : workspace;
  return persona({ ...overrides, workspaces: [{ roles: ['user'], ...ws }, ...(overrides.workspaces || [])] });
}

export function workspace(overrides: Partial<MockWorkspaceSeed> = {}): MockWorkspaceSeed {
  return { name: `Workspace ${next()}`, ...overrides };
}

/** A blueprint with a single required string `title` property. Pass `properties` to replace it. */
export function blueprint(identifier: string, overrides: Partial<MockBlueprintSeed> = {}): MockBlueprintSeed {
  return {
    identifier,
    name: identifier.charAt(0).toUpperCase() + identifier.slice(1),
    properties: { title: { title: 'Title', type: 'string', required: true } },
    ...overrides,
  };
}

/** `count` entities built from a template; `{n}` in string values is replaced by the 1-based index. */
export function entities(count: number, template: Record<string, unknown> | ((n: number) => Record<string, unknown>)) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    if (typeof template === 'function') return template(n);
    return Object.fromEntries(
      Object.entries(template).map(([k, v]) => [k, typeof v === 'string' ? v.replaceAll('{n}', String(n)) : v]),
    );
  });
}

/** Merge several seeds: arrays concatenate, `entities` and `roles` merge by key. */
export function mergeSeeds(...seeds: MockSeed[]): MockSeed {
  const out: Record<string, any> = {};
  for (const seed of seeds) {
    for (const [key, value] of Object.entries(seed)) {
      if (Array.isArray(value)) out[key] = [...(out[key] || []), ...value];
      else if (key === 'entities') {
        out.entities ??= {};
        for (const [bp, items] of Object.entries(value as Record<string, unknown[]>)) {
          out.entities[bp] = [...(out.entities[bp] || []), ...items];
        }
      } else if (value && typeof value === 'object') out[key] = { ...out[key], ...value };
    }
  }
  return out as MockSeed;
}
