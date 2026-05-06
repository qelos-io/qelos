import { NextResponse, type NextRequest } from 'next/server';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { applyQelosForwardHeaders } from './forward-headers';
import { createRequestSdk } from './sdk-factory';
import type {
  QelosNextConfig,
  QelosTokenPair,
  ResolvedTokens,
  TokenRefreshHook,
} from './types';

const DEFAULT_ACCESS_COOKIE = 'q_access_token';
const DEFAULT_REFRESH_COOKIE = 'q_refresh_token';

export interface PendingCookie {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    path: string;
  };
}

/**
 * Carrier passed to the App Router middleware token-refresh hook. Cookies
 * pushed onto `pendingCookies` are written to the outbound `NextResponse`
 * after identification completes — Next.js does not let us mutate the
 * response headers after `NextResponse.next()` has been constructed, so we
 * stage them here and flush them once the response object exists.
 */
export interface MiddlewareRefreshTarget {
  req: NextRequest;
  pendingCookies: PendingCookie[];
}

export interface CreateMiddlewareOptions {
  config: QelosNextConfig;
  /**
   * Hook invoked after a successful token refresh. The default implementation
   * stages new cookies for the outbound response.
   */
  onTokenRefresh?: TokenRefreshHook<MiddlewareRefreshTarget>;
  /**
   * Resolve the active workspace for a request. Defaults to picking the first
   * workspace returned from `sdk.workspaces.getList()`.
   */
  resolveWorkspace?: (params: {
    req: NextRequest;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

export type QelosMiddleware = (req: NextRequest) => Promise<NextResponse>;

function readTokens(req: NextRequest, config: QelosNextConfig): QelosTokenPair {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const cookieAccess = req.cookies.get(accessCookie)?.value;
  const cookieRefresh = req.cookies.get(refreshCookie)?.value;
  const authHeader = req.headers.get('authorization');
  const headerAccess =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  return {
    accessToken: headerAccess || cookieAccess || undefined,
    refreshToken: cookieRefresh || undefined,
  };
}

function stagePendingCookies(
  pending: PendingCookie[],
  config: QelosNextConfig,
  tokens: ResolvedTokens
): void {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const secure = !/^http:\/\//i.test(config.appUrl);
  const options = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
  };
  pending.push({ name: accessCookie, value: tokens.accessToken, options });
  pending.push({ name: refreshCookie, value: tokens.refreshToken, options });
}

function shouldSkip(req: NextRequest, config: QelosNextConfig): boolean {
  if (!config.skipPaths?.length) return false;
  const path = req.nextUrl.pathname;
  return config.skipPaths.some((prefix) => path.startsWith(prefix));
}

function unauthorized(): NextResponse {
  return new NextResponse(JSON.stringify({ code: 'UNAUTHORIZED' }), {
    status: 401,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Create a Next.js (App Router) edge middleware that identifies the user and
 * the active workspace via the Qelos SDK before the request reaches the
 * application's own handler. Resolved identity is forwarded to downstream
 * handlers via request headers (`x-qelos-user-id`, `x-qelos-workspace-id`);
 * use `getQelosContext()` from `@qelos/integrator-next/context` to obtain the
 * full user / workspace objects inside server components or route handlers.
 */
export function createQelosMiddleware(
  options: CreateMiddlewareOptions
): QelosMiddleware {
  const { config, resolveWorkspace } = options;
  const onTokenRefresh: TokenRefreshHook<MiddlewareRefreshTarget> =
    options.onTokenRefresh ||
    (async ({ target, newTokens }) => {
      stagePendingCookies(target.pendingCookies, config, newTokens);
    });

  return async function qelosMiddleware(req) {
    if (shouldSkip(req, config)) {
      return NextResponse.next();
    }

    const tokens = readTokens(req, config);
    const pendingCookies: PendingCookie[] = [];
    const forwardedHeaders = new Headers(req.headers);

    const sdk = createRequestSdk<MiddlewareRefreshTarget>({
      config,
      tokens,
      refreshTarget: { req, pendingCookies },
      onTokenRefresh,
    });

    const hasAuthMaterial = Boolean(
      config.apiToken || tokens.accessToken || tokens.refreshToken
    );

    let user: IUser | null = null;
    let workspaces: IWorkspace[] = [];
    let workspace: IWorkspace | null = null;
    let identifyFailed = false;

    if (hasAuthMaterial) {
      try {
        user = await sdk.authentication.getLoggedInUser();
      } catch {
        identifyFailed = true;
      }
      if (user) {
        try {
          workspaces = await sdk.workspaces.getList();
        } catch {
          workspaces = [];
        }
        if (workspaces.length) {
          if (resolveWorkspace) {
            workspace =
              (await resolveWorkspace({ req, user, workspaces })) || null;
          } else {
            workspace = workspaces[0] || null;
          }
        }
      }
    }

    if (config.requireAuth && (!hasAuthMaterial || identifyFailed)) {
      return unauthorized();
    }

    applyQelosForwardHeaders(forwardedHeaders, user, workspace);

    const response = NextResponse.next({
      request: { headers: forwardedHeaders },
    });

    for (const cookie of pendingCookies) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
  };
}
