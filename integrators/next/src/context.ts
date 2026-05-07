import { AsyncLocalStorage } from 'node:async_hooks';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { getDefaultQelosConfig } from './env-config';
import { createRequestSdk } from './sdk-factory';
import type {
  QelosNextConfig,
  QelosRequestContext,
  QelosTokenPair,
  TokenRefreshHook,
} from './types';

const DEFAULT_ACCESS_COOKIE = 'q_access_token';
const DEFAULT_REFRESH_COOKIE = 'q_refresh_token';

const storage = new AsyncLocalStorage<QelosRequestContext>();

/**
 * Run `fn` with `ctx` as the active Qelos request context. Code anywhere in
 * the resulting async stack can call `getStoredQelosContext()` to retrieve it
 * without prop-drilling.
 */
export function runWithQelosContext<T>(
  ctx: QelosRequestContext,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return storage.run(ctx, fn);
}

/**
 * Return the Qelos request context stored on the current async stack, or
 * `null` when no context has been entered.
 */
export function getStoredQelosContext(): QelosRequestContext | null {
  return storage.getStore() || null;
}

export interface GetQelosContextOptions {
  config: QelosNextConfig;
  /**
   * Hook invoked after a successful token refresh. App Router server
   * components and route handlers cannot mutate cookies after rendering
   * starts, so the default is a no-op. Callers handling refresh through a
   * route handler can override this to call `cookies().set(...)`.
   */
  onTokenRefresh?: TokenRefreshHook<null>;
  /**
   * Resolve the active workspace for a request. Defaults to picking the first
   * workspace returned from `sdk.workspaces.getList()`.
   */
  resolveWorkspace?: (params: {
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

interface CookieJar {
  get: (name: string) => { value: string } | undefined;
}
interface HeaderBag {
  get: (name: string) => string | null;
}

/**
 * `next/headers` typing differs between Next 14 (sync return) and Next 15
 * (Promise return). Both shapes are accepted — we always `await` the result
 * so the call site does not need to branch on the Next.js version.
 */
interface NextHeadersModule {
  cookies: () => CookieJar | Promise<CookieJar>;
  headers: () => HeaderBag | Promise<HeaderBag>;
}

let nextHeadersModulePromise: Promise<NextHeadersModule> | null = null;
function loadNextHeaders(): Promise<NextHeadersModule> {
  if (!nextHeadersModulePromise) {
    nextHeadersModulePromise = (async () => {
      const mod = (await import('next/headers')) as unknown as NextHeadersModule;
      return mod;
    })();
  }
  return nextHeadersModulePromise;
}

async function readTokensFromHeaders(
  config: QelosNextConfig
): Promise<QelosTokenPair> {
  const { cookies, headers } = await loadNextHeaders();
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const jar = await cookies();
  const hdr = await headers();
  const cookieAccess = jar.get(accessCookie)?.value;
  const cookieRefresh = jar.get(refreshCookie)?.value;
  const authHeader = hdr.get('authorization');
  const headerAccess =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  return {
    accessToken: headerAccess || cookieAccess || undefined,
    refreshToken: cookieRefresh || undefined,
  };
}

/**
 * Identify the user / workspace for the current App Router request and
 * return the Qelos context. Safe to call multiple times within the same
 * request — each call performs its own SDK round-trip, so wrap it with
 * React's `cache()` if you want a single resolution per render.
 *
 * Calling without arguments uses the env-derived config (see
 * {@link loadQelosConfigFromEnv}); pass `{ config }` explicitly when you
 * need full control or want to override resolution behavior.
 */
export async function getQelosContext(
  options?: GetQelosContextOptions
): Promise<QelosRequestContext> {
  const resolved: GetQelosContextOptions = options ?? { config: getDefaultQelosConfig() };
  const { config, resolveWorkspace } = resolved;
  const tokens = await readTokensFromHeaders(config);
  const sdk = createRequestSdk<null>({
    config,
    tokens,
    refreshTarget: null,
    onTokenRefresh: resolved.onTokenRefresh,
  });
  const ctx: QelosRequestContext = {
    user: null,
    workspace: null,
    workspaces: [],
    sdk,
    tokens,
  };

  const hasAuthMaterial = Boolean(
    config.apiToken || tokens.accessToken || tokens.refreshToken
  );
  if (!hasAuthMaterial) {
    return ctx;
  }

  try {
    ctx.user = await sdk.authentication.getLoggedInUser();
  } catch {
    return ctx;
  }

  if (!ctx.user) return ctx;

  try {
    ctx.workspaces = await sdk.workspaces.getList();
  } catch {
    ctx.workspaces = [];
  }

  if (ctx.workspaces.length) {
    if (resolveWorkspace) {
      ctx.workspace =
        (await resolveWorkspace({
          user: ctx.user,
          workspaces: ctx.workspaces,
        })) || null;
    } else {
      ctx.workspace = ctx.workspaces[0] || null;
    }
  }

  return ctx;
}

/**
 * Convenience wrapper: resolve the Qelos context, store it in
 * AsyncLocalStorage, and run `fn` inside that scope. Useful as the top of an
 * App Router route handler when you want downstream code (utility modules,
 * etc.) to read the context via `getStoredQelosContext()`.
 */
export async function withQelosContext<T>(
  options: GetQelosContextOptions,
  fn: (ctx: QelosRequestContext) => T | Promise<T>
): Promise<T> {
  const ctx = await getQelosContext(options);
  return await storage.run(ctx, () => Promise.resolve(fn(ctx)));
}

/**
 * Throw a 401-like error if the current stored context has no user.
 * Returns the context for chaining.
 */
export function requireQelosUser(): QelosRequestContext {
  const ctx = getStoredQelosContext();
  if (!ctx || !ctx.user) {
    const err = new Error('UNAUTHORIZED') as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return ctx;
}
