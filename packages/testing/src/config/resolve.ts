import type { MockQelosOptions, MockSeed, ResolvedMockConfig } from './types.js';

export class MockConfigError extends Error {
  code = 'QELOS_MOCK_INVALID_CONFIG';
  constructor(message: string) {
    super(`@qelos/testing: ${message}`);
    this.name = 'MockConfigError';
  }
}

const SEED_ARRAYS = ['users', 'workspaces', 'personas', 'blueprints', 'configurations', 'blocks', 'components', 'events', 'agents', 'aiResponses', 'lambdas', 'threads'] as const;

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
  if (seed.roles !== undefined) {
    if (!isObject(seed.roles)) throw new MockConfigError('"seed.roles" must be an object keyed by role');
    for (const [role, perms] of Object.entries(seed.roles)) {
      if (!Array.isArray(perms) || perms.some((p) => typeof p !== 'string')) {
        throw new MockConfigError(`"seed.roles.${role}" must be an array of permission strings`);
      }
    }
  }
  for (const p of (seed.personas as any[]) || []) {
    if (p.workspaces !== undefined && (!Array.isArray(p.workspaces) || p.workspaces.some((w: unknown) => !isObject(w)))) {
      throw new MockConfigError('persona "workspaces" must be an array of objects');
    }
    if (p.roles !== undefined && (!Array.isArray(p.roles) || p.roles.some((x: unknown) => typeof x !== 'string'))) {
      throw new MockConfigError('persona "roles" must be an array of strings');
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
  expectType('artifactsDir', o.artifactsDir, 'string');
  expectType('reimport', o.reimport, 'boolean');
  if (o.onConflict !== undefined && o.onConflict !== 'replace' && o.onConflict !== 'skip') {
    throw new MockConfigError('"onConflict" must be "replace" or "skip"');
  }
  if (o.dataDir !== undefined && !o.dataDir) throw new MockConfigError('"dataDir" must not be empty');
  if (o.tenant !== undefined) {
    if (!isObject(o.tenant)) throw new MockConfigError('"tenant" must be an object');
    expectType('tenant.name', o.tenant.name, 'string');
    expectType('tenant.appUrl', o.tenant.appUrl, 'string');
  }
  if (o.auth !== undefined) {
    if (!isObject(o.auth)) throw new MockConfigError('"auth" must be an object');
    for (const k of ['accessTokenTtlMs', 'refreshTokenTtlMs', 'cookieTokenTtlMs'] as const) {
      expectType(`auth.${k}`, o.auth[k], 'number');
    }
    expectType('auth.personalWorkspace', o.auth.personalWorkspace, 'boolean');
    expectType('auth.defaultRole', o.auth.defaultRole, 'string');
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
