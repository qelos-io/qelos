import { NextResponse, type NextRequest } from 'next/server';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { rewriteSetCookieDomain } from './cookies';
import { applyQelosForwardHeaders } from './forward-headers';
import { getDefaultQelosConfig } from './env-config';
import { fetchMeIdentity } from './me-client';
import { resolveQelosProxyTarget } from './proxy-target';
import { createRequestSdk } from './sdk-factory';
import type { QelosNextConfig } from './types';

export interface CreateMiddlewareOptions {
  config: QelosNextConfig;
  /**
   * Resolve the active workspace for a request. Defaults to whatever
   * `/api/me` reports on `user.workspace` (the user's currently activated
   * workspace, or `null` when none is active).
   */
  resolveWorkspace?: (params: {
    req: NextRequest;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

export type QelosMiddleware = (req: NextRequest) => Promise<NextResponse>;

function mergeProxySkipPaths(config: QelosNextConfig): string[] | undefined {
  const merged = [...(config.skipPaths ?? [])];
  if (config.disableProxy !== true) {
    const hasApiPrefix = merged.some(
      (p) => p === '/api' || p === '/api/' || p.startsWith('/api/'),
    );
    if (!hasApiPrefix) {
      merged.unshift('/api/');
    }
  }
  return merged.length ? merged : undefined;
}

function shouldSkip(req: NextRequest, skipPaths: string[] | undefined): boolean {
  if (!skipPaths?.length) return false;
  const path = req.nextUrl.pathname;
  return skipPaths.some((prefix) => path.startsWith(prefix));
}

function unauthorized(): NextResponse {
  return new NextResponse(JSON.stringify({ code: 'UNAUTHORIZED' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Create a Next.js (App Router) edge middleware that identifies the user and
 * the active workspace via a same-origin BFF round-trip to Qelos `GET /api/me`
 * before the request reaches the application's own handler. Resolved identity
 * is forwarded to downstream handlers via request headers (`x-qelos-user-id`,
 * `x-qelos-workspace-id`); use `getQelosContext()` from
 * `@qelos/integrator-next/context` to obtain the full user / workspace objects
 * inside server components or route handlers.
 */
export function createQelosMiddleware(
  options: CreateMiddlewareOptions
): QelosMiddleware {
  const { config, resolveWorkspace } = options;
  const skipPathsEffective = mergeProxySkipPaths(config);

  return async function qelosMiddleware(req) {
    if (shouldSkip(req, skipPathsEffective)) {
      return NextResponse.next();
    }

    const getHeaders = () => ({
      cookie: req.headers.get('cookie') ?? undefined,
      authorization: req.headers.get('authorization') ?? undefined,
    });

    const sdk = createRequestSdk({ config, getHeaders });

    const base = resolveQelosProxyTarget(config);
    if (!base && !config.apiToken) {
      if (config.requireAuth) {
        return unauthorized();
      }
      const forwardedHeaders = new Headers(req.headers);
      applyQelosForwardHeaders(forwardedHeaders, null, null);
      return NextResponse.next({ request: { headers: forwardedHeaders } });
    }

    let user: IUser | null = null;
    let setCookieValues: string[] = [];
    const originalHost = req.headers.get('host');

    if (base) {
      const h = getHeaders();
      const { response, user: meUser } = await fetchMeIdentity({
        base,
        cookie: h.cookie,
        authorization: h.authorization,
      });
      user = meUser;
      setCookieValues = response.headers.getSetCookie?.() ?? [];
    }

    let workspace: IWorkspace | null = null;
    let workspaces: IWorkspace[] = [];

    if (user) {
      try {
        workspaces = await sdk.workspaces.getList();
      } catch {
        workspaces = [];
      }
      if (resolveWorkspace) {
        workspace =
          (await resolveWorkspace({ req, user, workspaces })) || null;
      } else {
        workspace =
          (user as unknown as { workspace?: IWorkspace | null }).workspace ||
          null;
      }
    }

    if (!user) {
      if (config.requireAuth) {
        return unauthorized();
      }
      const forwardedHeaders = new Headers(req.headers);
      applyQelosForwardHeaders(forwardedHeaders, null, null);
      const res = NextResponse.next({ request: { headers: forwardedHeaders } });
      for (const value of setCookieValues) {
        res.headers.append(
          'set-cookie',
          rewriteSetCookieDomain(value, originalHost ?? undefined),
        );
      }
      return res;
    }

    const forwardedHeaders = new Headers(req.headers);
    applyQelosForwardHeaders(forwardedHeaders, user, workspace);
    const res = NextResponse.next({ request: { headers: forwardedHeaders } });
    for (const value of setCookieValues) {
      res.headers.append(
        'set-cookie',
        rewriteSetCookieDomain(value, originalHost ?? undefined),
      );
    }
    return res;
  };
}

let defaultMiddleware: QelosMiddleware | null = null;

/**
 * Pre-configured Next.js edge middleware that reads its config from the
 * environment (see {@link loadQelosConfigFromEnv}). Re-export it from your
 * `middleware.ts` to opt into Qelos identification with zero setup:
 *
 * ```ts
 * // middleware.ts
 * export { qelosMiddleware as middleware } from '@qelos/integrator-next/middleware';
 * export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
 * ```
 *
 * Each invocation lazily instantiates the middleware on the first call so
 * importing this module does not throw when env vars are not yet loaded.
 * For full control, call {@link createQelosMiddleware} with an explicit config.
 */
export const qelosMiddleware: QelosMiddleware = (req) => {
  if (!defaultMiddleware) {
    defaultMiddleware = createQelosMiddleware({ config: getDefaultQelosConfig() });
  }
  return defaultMiddleware(req);
};
