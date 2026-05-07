/**
 * Shared bootstrap for the integrator integration test suite.
 *
 * The suite expects a real Qelos stack (gateway + auth + no-code + plugins) to
 * be reachable at `QELOS_INTEGRATOR_E2E_URL` (or `QELOS_E2E_URL`), with the
 * default admin user from `pnpm populate-db` (test@test.com / admin). When
 * the env var is not set, each test file calls {@link assertE2eEnabled} to skip
 * cleanly.
 *
 * Local/CI runbook: start the stack (e.g. `compose/` docker-compose with the
 * gateway port published), run `pnpm populate-db` where auth can reach MongoDB,
 * export `QELOS_INTEGRATOR_E2E_URL` to the gateway base URL, then
 * `pnpm e2e:integrators` or `qelos test integrators`.
 */
import QelosAdministratorSDK from '@qelos/sdk/administrator';
import QelosSDK from '@qelos/sdk';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';

export interface IntegratorTestEnv {
  appUrl: string;
  username: string;
  password: string;
  /** Blueprint identifier used to exercise SDK entity operations. */
  blueprintIdentifier: string;
}

export interface LoginResult {
  user: IUser;
  workspace: IWorkspace | null;
  accessToken: string;
  refreshToken: string;
}

const DEFAULT_BLUEPRINT_KEY = 'integrator-e2e-items';

export function readEnv(): IntegratorTestEnv | null {
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
    blueprintIdentifier:
      process.env.QELOS_INTEGRATOR_E2E_BLUEPRINT || DEFAULT_BLUEPRINT_KEY,
  };
}

/**
 * Returns the test env when integrator e2e is enabled, otherwise prints a
 * skip message and returns null. Each integrator test file uses this to opt
 * out of running when the stack is not reachable.
 */
export function assertE2eEnabled(): IntegratorTestEnv | null {
  const env = readEnv();
  if (!env) {
    // eslint-disable-next-line no-console
    console.warn(
      '[integrator-e2e] QELOS_INTEGRATOR_E2E_URL not set — skipping integration tests',
    );
    return null;
  }
  return env;
}

export async function login(env: IntegratorTestEnv): Promise<LoginResult> {
  const sdk = new QelosAdministratorSDK({
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
  return {
    user: payload.user,
    workspace: (payload as any).workspace ?? null,
    accessToken: payload.token,
    refreshToken: payload.refreshToken,
  };
}

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
 * Builds a Cookie header carrying the access + refresh tokens under the
 * default cookie names recognized by every integrator.
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
