import { AsyncLocalStorage } from 'node:async_hooks';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { rewriteSetCookieDomain } from './cookies';
import { getDefaultQelosConfig } from './env-config';
import { fetchMeIdentity } from './me-client';
import { resolveQelosProxyTarget } from './proxy-target';
import { createRequestSdk } from './sdk-factory';
import type { QelosNextConfig, QelosRequestContext } from './types';

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
   * Resolve the active workspace for a request. Defaults to whatever
   * `/api/me` reports on `user.workspace` (the user's currently activated
   * workspace, or `null` when none is active).
   */
  resolveWorkspace?: (params: {
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
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

async function getInboundAuthHeaders(): Promise<{
  cookie?: string;
  authorization?: string;
  host: string | null;
}> {
  const { headers } = await loadNextHeaders();
  const hdr = await Promise.resolve(headers());
  return {
    cookie: hdr.get('cookie') ?? undefined,
    authorization: hdr.get('authorization') ?? undefined,
    host: hdr.get('host'),
  };
}

async function forwardSetCookieThroughNextCookies(
  rawLines: string[],
  originalHost: string | null,
): Promise<void> {
  const rewritten = rawLines.map((v) =>
    rewriteSetCookieDomain(v, originalHost ?? undefined),
  );
  try {
    const { cookies } = await import('next/headers');
    const jar = await Promise.resolve(cookies());
    for (const line of rewritten) {
      const semi = line.indexOf(';');
      const nv = (semi === -1 ? line : line.slice(0, semi)).trim();
      const eq = nv.indexOf('=');
      if (eq <= 0) continue;
      const name = nv.slice(0, eq).trim();
      const value = nv.slice(eq + 1).trim();
      if (!name) continue;
      try {
        (jar as { set: (n: string, v: string, o?: object) => void }).set(
          name,
          value,
          { path: '/' },
        );
      } catch {
        // not writable in this context
      }
    }
  } catch {
    //
  }
}

/**
 * Identify the user / workspace for the current App Router request and
 * return the Qelos context. Safe to call multiple times within the same
 * request — each call performs its own `/api/me` round-trip, so wrap it with
 * React's `cache()` if you want a single resolution per render.
 *
 * Calling without arguments uses the env-derived config (see
 * {@link loadQelosConfigFromEnv}); pass `{ config }` explicitly when you
 * need full control or want to override resolution behavior.
 */
export async function getQelosContext(
  options?: GetQelosContextOptions
): Promise<QelosRequestContext> {
  const resolved = options ?? { config: getDefaultQelosConfig() };
  const { config, resolveWorkspace } = resolved;

  const getHeaders = () => getInboundAuthHeaders();

  const sdk = createRequestSdk({ config, getHeaders });

  const ctx: QelosRequestContext = {
    user: null,
    workspace: null,
    workspaces: [],
    sdk,
  };

  const base = resolveQelosProxyTarget(config);
  if (!base && !config.apiToken) {
    return ctx;
  }

  if (base) {
    const h = await getInboundAuthHeaders();
    const { response, user } = await fetchMeIdentity({
      base,
      cookie: h.cookie,
      authorization: h.authorization,
    });
    const setCookieValues = response.headers.getSetCookie?.() ?? [];
    await forwardSetCookieThroughNextCookies(setCookieValues, h.host);
    ctx.user = user;
  }

  if (!ctx.user) {
    return ctx;
  }

  try {
    ctx.workspaces = await sdk.workspaces.getList();
  } catch {
    ctx.workspaces = [];
  }

  if (resolveWorkspace) {
    ctx.workspace =
      (await resolveWorkspace({
        user: ctx.user,
        workspaces: ctx.workspaces,
      })) || null;
  } else {
    ctx.workspace =
      (ctx.user as unknown as { workspace?: IWorkspace | null }).workspace ||
      null;
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
