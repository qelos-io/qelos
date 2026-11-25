import type { MockQelosOptions, MockSeed, ResolvedMockConfig } from './types.js';

export class MockConfigError extends Error {
  code = 'QELOS_MOCK_INVALID_CONFIG';
  constructor(message: string) {
    super(`@qelos/dev-mock: ${message}`);
    this.name = 'MockConfigError';
  }
}

const SEED_ARRAYS = ['users', 'workspaces', 'personas', 'blueprints', 'configurations', 'blocks'] as const;

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function expectType(name: string, value: unknown, type: 'string' | 'boolean' | 'number') {
  if (value !== undefined && typeof value !== type) {
    throw new MockConfigError(`"${name}" must be a ${type}`);
  }
}

export function validateSeed(seed: unknown): MockSeed {
  if (seed === undefined) return {};
  if (!isObject(seed)) throw new MockConfigError('"seed" must be an object');
  for (const key of SEED_ARRAYS) {
    const list = seed[key];
    if (list === undefined) continue;
    if (!Array.isArray(list) || list.some((i) => !isObject(i))) {
      throw new MockConfigError(`"seed.${key}" must be an array of objects`);
    }
  }
  if (seed.entities !== undefined) {
    if (!isObject(seed.entities)) throw new MockConfigError('"seed.entities" must be an object keyed by blueprint');
    for (const [bp, list] of Object.entries(seed.entities)) {
      if (!Array.isArray(list) || list.some((i) => !isObject(i))) {
        throw new MockConfigError(`"seed.entities.${bp}" must be an array of objects`);
      }
    }
  }
  for (const u of [...((seed.users as any[]) || []), ...((seed.personas as any[]) || [])]) {
    if (typeof u.email !== 'string' || !u.email) throw new MockConfigError('seed users/personas require an "email"');
  }
  return seed as MockSeed;
}

/** Validate options at runtime and apply defaults. Throws MockConfigError. */
export function validateMockConfig(options: unknown = {}): ResolvedMockConfig {
  if (!isObject(options)) throw new MockConfigError('options must be an object');
  const o = options as MockQelosOptions;
  expectType('enabled', o.enabled, 'boolean');
  expectType('dataDir', o.dataDir, 'string');
  expectType('persist', o.persist, 'boolean');
  expectType('defaultPersona', o.defaultPersona, 'string');
  expectType('allowInProduction', o.allowInProduction, 'boolean');
  expectType('persistDebounceMs', o.persistDebounceMs, 'number');
  if (o.dataDir !== undefined && !o.dataDir) throw new MockConfigError('"dataDir" must not be empty');
  if (o.tenant !== undefined) {
    if (!isObject(o.tenant)) throw new MockConfigError('"tenant" must be an object');
    expectType('tenant.name', o.tenant.name, 'string');
    expectType('tenant.appUrl', o.tenant.appUrl, 'string');
  }
  const persist = o.persist ?? !!o.dataDir;
  if (persist && !o.dataDir) throw new MockConfigError('"persist" requires "dataDir"');
  return { ...o, enabled: o.enabled ?? true, persist, seed: validateSeed(o.seed) };
}

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['', '0', 'false', 'no', 'off']);

/**
 * Resolve config from the QELOS_MOCK env var (`1`/`true` or a folder path),
 * merged with explicit options. Explicit options win over env.
 * Returns `enabled: false` when neither enables the mock.
 */
export function resolveMockConfig(
  env: Record<string, string | undefined> = process.env,
  explicit?: MockQelosOptions,
): ResolvedMockConfig {
  const raw = env.QELOS_MOCK?.trim();
  const fromEnv: MockQelosOptions = {};
  if (raw !== undefined) {
    const lower = raw.toLowerCase();
    if (FALSE_VALUES.has(lower)) fromEnv.enabled = false;
    else if (TRUE_VALUES.has(lower)) fromEnv.enabled = true;
    else {
      fromEnv.enabled = true;
      fromEnv.dataDir = raw;
    }
  }
  const merged: MockQelosOptions = { ...fromEnv };
  for (const [k, v] of Object.entries(explicit || {})) {
    if (v !== undefined) (merged as any)[k] = v;
  }
  // nothing enabled it -> disabled
  if (merged.enabled === undefined) merged.enabled = false;
  return validateMockConfig(merged);
}
