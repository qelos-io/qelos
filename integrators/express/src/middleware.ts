import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { createRequestSdk } from './sdk-factory';
import type {
  QelosExpressConfig,
  QelosRequestContext,
  QelosTokenPair,
  ResolvedTokens,
  TokenRefreshHook,
} from './types';

const DEFAULT_ACCESS_COOKIE = 'q_access_token';
const DEFAULT_REFRESH_COOKIE = 'q_refresh_token';

export interface CreateMiddlewareOptions {
  config: QelosExpressConfig;
  /**
   * Hook invoked after a successful token refresh. The default implementation
   * writes the new tokens back to the response cookies.
   */
  onTokenRefresh?: TokenRefreshHook;
  /**
   * Resolve the active workspace for a request. Defaults to picking the first
   * workspace returned from `sdk.workspaces.getList()`.
   */
  resolveWorkspace?: (params: {
    req: Request;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

function readCookie(req: Request, name: string): string | undefined {
  // Prefer cookie-parser output when available.
  const parsed = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (parsed && typeof parsed[name] === 'string') {
    return parsed[name];
  }
  const header = req.headers.cookie;
  if (!header) return undefined;
  const prefix = name + '=';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }
  return undefined;
}

function readTokens(req: Request, config: QelosExpressConfig): QelosTokenPair {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const cookieAccess = readCookie(req, accessCookie);
  const cookieRefresh = readCookie(req, refreshCookie);
  const authHeader = req.headers.authorization;
  const headerAccess =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  return {
    accessToken: headerAccess || cookieAccess || undefined,
    refreshToken: cookieRefresh || undefined,
  };
}

function serializeCookie(
  name: string,
  value: string,
  secure: boolean,
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function appendSetCookie(res: Response, value: string): void {
  const existing = res.getHeader('set-cookie');
  if (Array.isArray(existing)) {
    res.setHeader('set-cookie', [...existing, value]);
  } else if (typeof existing === 'string') {
    res.setHeader('set-cookie', [existing, value]);
  } else {
    res.setHeader('set-cookie', [value]);
  }
}

function writeTokensToCookies(
  res: Response,
  config: QelosExpressConfig,
  tokens: ResolvedTokens,
): void {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const secure = !/^http:\/\//i.test(config.appUrl);

  // Prefer Express's res.cookie when present so the consumer's cookie
  // settings/middleware (e.g. signed cookies) keep working.
  type CookieResponse = Response & {
    cookie?: (
      name: string,
      value: string,
      options: Record<string, unknown>,
    ) => Response;
  };
  const cookieRes = res as CookieResponse;
  if (typeof cookieRes.cookie === 'function') {
    const cookieOptions = {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
    };
    cookieRes.cookie(accessCookie, tokens.accessToken, cookieOptions);
    if (tokens.refreshToken) {
      cookieRes.cookie(refreshCookie, tokens.refreshToken, cookieOptions);
    }
    return;
  }

  appendSetCookie(res, serializeCookie(accessCookie, tokens.accessToken, secure));
  if (tokens.refreshToken) {
    appendSetCookie(res, serializeCookie(refreshCookie, tokens.refreshToken, secure));
  }
}

function shouldSkip(req: Request, config: QelosExpressConfig): boolean {
  if (!config.skipPaths?.length) return false;
  const path = req.path || req.url || '';
  return config.skipPaths.some((prefix) => path.startsWith(prefix));
}

export function createQelosMiddleware(
  options: CreateMiddlewareOptions,
): RequestHandler {
  const { config, resolveWorkspace } = options;
  const onTokenRefresh: TokenRefreshHook =
    options.onTokenRefresh ||
    (async ({ res, newTokens }) => {
      writeTokensToCookies(res, config, newTokens);
    });

  return async function qelosMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (shouldSkip(req, config)) {
      next();
      return;
    }

    const tokens = readTokens(req, config);
    const sdk = createRequestSdk({ config, tokens, req, res, onTokenRefresh });

    const ctx: QelosRequestContext = {
      user: null,
      workspace: null,
      workspaces: [],
      sdk,
      tokens,
    };
    req.qelos = ctx;

    const hasAuthMaterial = Boolean(
      config.apiToken || tokens.accessToken || tokens.refreshToken,
    );
    if (!hasAuthMaterial) {
      if (config.requireAuth) {
        res.status(401).json({ code: 'UNAUTHORIZED' });
        return;
      }
      next();
      return;
    }

    try {
      ctx.user = await sdk.authentication.getLoggedInUser();
    } catch {
      if (config.requireAuth) {
        res.status(401).json({ code: 'UNAUTHORIZED' });
        return;
      }
      next();
      return;
    }

    try {
      ctx.workspaces = await sdk.workspaces.getList();
    } catch {
      ctx.workspaces = [];
    }

    if (ctx.user && ctx.workspaces.length) {
      if (resolveWorkspace) {
        ctx.workspace =
          (await resolveWorkspace({
            req,
            user: ctx.user,
            workspaces: ctx.workspaces,
          })) || null;
      } else {
        ctx.workspace = ctx.workspaces[0] || null;
      }
    }

    next();
  };
}

export type QelosMiddleware = ReturnType<typeof createQelosMiddleware>;

/**
 * Wrap a route handler so it only runs when `req.qelos.user` is populated.
 * Otherwise responds with 401. Intended to be mounted *after*
 * `createQelosMiddleware`.
 */
export function requireUser(
  handler: RequestHandler,
): RequestHandler {
  return function qelosRequireUser(req, res, next) {
    if (!req.qelos || !req.qelos.user) {
      res.status(401).json({ code: 'UNAUTHORIZED' });
      return;
    }
    return handler(req, res, next);
  };
}
