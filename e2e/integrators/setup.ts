/**
 * Shared bootstrap and fixture for the integrator integration test suite.
 *
 * Boots a real Qelos stack (gateway + auth + no-code + plugins) and exposes
 * helpers each `e2e/integrators/<framework>.test.ts` can reuse: env reader,
 * authenticated login, blueprint and workspace seeding. Tests skip cleanly
 * when env vars are unset, so the suite runs on PRs without secrets.
 *
 * Required env vars:
 *   QELOS_INTEGRATOR_E2E_URL       — gateway base URL (e.g. http://localhost:9000)
 *   QELOS_INTEGRATOR_E2E_USERNAME  — default test@test.com (from `pnpm populate-db`)
 *   QELOS_INTEGRATOR_E2E_PASSWORD  — default admin
 *
 * Optional overrides:
 *   QELOS_INTEGRATOR_E2E_BLUEPRINT — blueprint identifier (default integrator-e2e-items)
 *   QELOS_INTEGRATOR_E2E_WORKSPACE — workspace slug (default e2e-test)
 *
 * Usage from a test file:
 * ```ts
 * import { describe, before } from 'node:test';
 * import { shouldSkip, skipReason, getEnv, login, type LoginResult } from './setup.js';
 *
 * describe('integrator-foo e2e', { skip: shouldSkip ? skipReason : false }, () => {
 *   if (shouldSkip) return;
 *   const env = getEnv();
 *   let session: LoginResult;
 *   before(async () => { session = await login(env); });
 *   // …
 * });
 * ```
 *
 * Per-test skip (when finer control is needed):
 * ```ts
 * it('something', (t) => {
 *   if (shouldSkip) return t.skip(skipReason);
 *   // …
 * });
 * ```
 *
 * Local/CI runbook: start the stack (e.g. `compose/` docker-compose with the
 * gateway port published), run `pnpm populate-db` where auth can reach MongoDB,
 * export `QELOS_INTEGRATOR_E2E_URL` to the gateway base URL, then
 * `pnpm -F e2e test` or `qelos test integrators`.
 */
import QelosAdministratorSDK from '@qelos/sdk/administrator';
import QelosSDK from '@qelos/sdk';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';

export interface IntegratorTestEnv {
  appUrl: string;
  username: string;
  password: string;
  /**
   * Stable slug-like name used to look up (and create on first run) the
   * workspace each test session activates. Tests that need to assert *which*
   * workspace was picked must look up by this slug, not by index, so
   * ordering changes in `sdk.workspaces.getList()` don't flake the suite.
   */
  workspaceSlug: string;
  /** Blueprint identifier exercised by SDK entity operations. */
  blueprintIdentifier: string;
}

export interface LoginResult {
  /** Authenticated SDK instance — already carries access + refresh tokens. */
  sdk: QelosSDK;
  user: IUser;
  workspace: IWorkspace;
  workspaceId: string;
  accessToken: string;
  refreshToken: string;
}

const DEFAULT_BLUEPRINT_KEY = 'integrator-e2e-items';
const DEFAULT_WORKSPACE_SLUG = 'e2e-test';

function readEnvInternal(): IntegratorTestEnv | null {
  const appUrl =
    process.env.QELOS_INTEGRATOR_E2E_URL || process.env.QELOS_E2E_URL;
  if (!appUrl) return null;
  return {
    appUrl: appUrl.replace(/\/$/, ''),
    username:
      process.env.QELOS_INTEGRATOR_E2E_USERNAME ||
      process.env.QELOS_E2E_USERNAME ||
      'test@test.com',
    password:
      process.env.QELOS_INTEGRATOR_E2E_PASSWORD ||
      process.env.QELOS_E2E_PASSWORD ||
      'admin',
    workspaceSlug:
      process.env.QELOS_INTEGRATOR_E2E_WORKSPACE || DEFAULT_WORKSPACE_SLUG,
    blueprintIdentifier:
      process.env.QELOS_INTEGRATOR_E2E_BLUEPRINT || DEFAULT_BLUEPRINT_KEY,
  };
}

const cachedEnv = readEnvInternal();

/**
 * `true` when any required env var is missing — every integrator test file
 * passes this to `describe(..., { skip: shouldSkip ? skipReason : false })`
 * so the suite no-ops without secrets (e.g. fork PRs) instead of throwing.
 */
export const shouldSkip: boolean = cachedEnv === null;

/** Human-readable reason surfaced to `describe`/`t.skip` calls. */
export const skipReason = 'integrator e2e env not configured';

/**
 * Returns the resolved test env. Throws when called without first checking
 * {@link shouldSkip}; treat a thrown error as a missed skip gate in the test.
 */
export function getEnv(): IntegratorTestEnv {
  if (!cachedEnv) {
    throw new Error(
      '[integrator-e2e] env not configured — gate the test with `shouldSkip` first',
    );
  }
  return cachedEnv;
}

/**
 * @deprecated Prefer {@link shouldSkip} + {@link getEnv}. Returns the env when
 * available, otherwise logs a warning and returns null. Kept for the existing
 * test files that branch on a nullable env value.
 */
export function assertE2eEnabled(): IntegratorTestEnv | null {
  if (!cachedEnv) {
    // eslint-disable-next-line no-console
    console.warn(`[integrator-e2e] ${skipReason} — skipping integration tests`);
    return null;
  }
  return cachedEnv;
}

/**
 * Sign in as the e2e user with `@qelos/sdk` and resolve the active workspace
 * by slug (creating it on first run). The returned SDK already carries the
 * access + refresh tokens so callers can drive entity / workspace operations
 * without re-authenticating.
 */
export async function login(env: IntegratorTestEnv): Promise<LoginResult> {
  const sdk = new QelosSDK({
    fetch: globalThis.fetch,
    appUrl: env.appUrl,
    forceRefresh: true,
  });
  const data = await sdk.authentication.oAuthSignin({
    username: env.username,
    password: env.password,
  });
  const payload = data.payload;
  if (!payload?.token || !payload.refreshToken) {
    throw new Error('login response missing token/refreshToken');
  }
  const workspace = await ensureTestWorkspace(env, sdk);
  return {
    sdk,
    user: payload.user,
    workspace,
    workspaceId: String(workspace._id),
    accessToken: payload.token,
    refreshToken: payload.refreshToken,
  };
}

/**
 * Sign in as an admin (used for setup tasks that need `manageBlueprints`).
 * The same `test@test.com` user is admin in the seeded stack — this returns
 * an admin-capable SDK rather than the user-flavored one from {@link login}.
 */
export async function loginAdmin(
  env: IntegratorTestEnv,
): Promise<QelosAdministratorSDK> {
  const sdk = new QelosAdministratorSDK({
    fetch: globalThis.fetch,
    appUrl: env.appUrl,
    forceRefresh: true,
  });
  await sdk.authentication.oAuthSignin({
    username: env.username,
    password: env.password,
  });
  return sdk;
}

/**
 * Find the e2e workspace by its stable slug, creating one when missing. Tests
 * MUST resolve by this helper rather than by index — `getList()` order is not
 * a contract and flakes when the seeded user gets new workspaces.
 */
export async function ensureTestWorkspace(
  env: IntegratorTestEnv,
  sdk: QelosSDK,
): Promise<IWorkspace> {
  const workspaces = await sdk.workspaces.getList();
  const existing = pickWorkspaceBySlug(workspaces, env.workspaceSlug);
  if (existing) return existing;
  return sdk.workspaces.create({ name: env.workspaceSlug });
}

/**
 * Locate a workspace by its slug-like `name`. Used by integrator tests to
 * verify workspace resolution without relying on `getList()` ordering.
 */
export function pickWorkspaceBySlug(
  workspaces: IWorkspace[],
  slug: string,
): IWorkspace | null {
  return workspaces.find((w) => w.name === slug) ?? null;
}

/**
 * Ensure a known blueprint exists so each integrator can exercise
 * `sdk.entities(<blueprint>).find()`. Idempotent — reuses an existing
 * blueprint when one is already present.
 */
export async function ensureTestBlueprint(
  env: IntegratorTestEnv,
  admin: QelosAdministratorSDK,
): Promise<string> {
  const key = env.blueprintIdentifier;
  try {
    const existing = await admin.manageBlueprints.getBlueprint(key);
    if (existing && (existing as any).identifier === key) {
      return key;
    }
  } catch {
    /* not found — create below */
  }

  await admin.manageBlueprints.create({
    identifier: key,
    name: 'Integrator e2e items',
    description: 'Created by e2e/integrators tests; safe to delete.',
    entityIdentifierMechanism: 'guid',
    permissionScope: 'workspace',
    permissions: [
      {
        scope: 'workspace',
        operation: 'read',
        guest: false,
        roleBased: ['*'],
        workspaceRoleBased: ['*'],
        workspaceLabelsBased: ['*'],
      },
      {
        scope: 'workspace',
        operation: 'create',
        guest: false,
        roleBased: ['*'],
        workspaceRoleBased: ['*'],
        workspaceLabelsBased: ['*'],
      },
    ],
    properties: {
      title: {
        title: 'Title',
        type: 'string',
        description: 'Display title',
        required: true,
      },
    },
    updateMapping: {},
    relations: [],
    dispatchers: { create: false, update: false, delete: false },
  } as any);
  return key;
}

/**
 * Build a SDK instance that mimics what the integrators construct internally.
 * Used by tests that compare integrator-attached context against direct SDK
 * calls (e.g. the resolved user/workspace).
 */
export function makeSdk(
  env: IntegratorTestEnv,
  tokens: { accessToken: string; refreshToken?: string },
): QelosSDK {
  return new QelosSDK({
    fetch: globalThis.fetch,
    appUrl: env.appUrl,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    forceRefresh: true,
  });
}

/**
 * Builds a `Cookie:` header carrying the access + refresh tokens under the
 * default cookie names recognized by every integrator. `node:fetch` does NOT
 * jar cookies across calls, so each follow-up request must rebuild this
 * header from {@link parseSetCookies} output.
 */
export function cookieHeader(tokens: {
  accessToken?: string;
  refreshToken?: string;
}): string {
  const parts: string[] = [];
  if (tokens.accessToken) parts.push(`q_access_token=${tokens.accessToken}`);
  if (tokens.refreshToken) parts.push(`q_refresh_token=${tokens.refreshToken}`);
  return parts.join('; ');
}
