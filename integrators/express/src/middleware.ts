import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { rewriteSetCookieDomain } from './cookies';
import { resolveQelosProxyTarget } from './proxy-target';
import { createRequestSdk } from './sdk-factory';
import type { QelosExpressConfig, QelosRequestContext } from './types';

export interface CreateMiddlewareOptions {
  config: QelosExpressConfig;
  /**
   * Resolve the active workspace for a request. Defaults to whatever
   * `/api/me` reports on `user.workspace` (the user's currently activated
   * workspace, or `null` when none is active).
   */
  resolveWorkspace?: (params: {
    req: Request;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

function shouldSkip(req: Request, config: QelosExpressConfig): boolean {
  if (!config.skipPaths?.length) return false;
  const path = req.path || req.url || '';
  return config.skipPaths.some((prefix) => path.startsWith(prefix));
}

function buildMeUrl(base: string): string {
  return `${base.replace(/\/+$/, '')}/api/me`;
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

export function createQelosMiddleware(
  options: CreateMiddlewareOptions,
): RequestHandler {
  const { config, resolveWorkspace } = options;
  const sdkFetch = (config.sdkOptions?.fetch ?? globalThis.fetch) as typeof globalThis.fetch;

  return async function qelosMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (shouldSkip(req, config)) {
      next();
      return;
    }

    const sdk = createRequestSdk({ config, req });

    const ctx: QelosRequestContext = {
      user: null,
      workspace: null,
      workspaces: [],
      sdk,
    };
    req.qelos = ctx;

    const base = resolveQelosProxyTarget(config);
    if (!base && !config.apiToken) {
      if (config.requireAuth) {
        res.status(401).json({ code: 'UNAUTHORIZED' });
        return;
      }
      next();
      return;
    }

    if (base) {
      const headers: Record<string, string> = {};
      if (req.headers.cookie) headers.cookie = req.headers.cookie;
      if (req.headers.authorization) {
        headers.authorization = req.headers.authorization;
      }

      const originalHost = req.headers.host;

      let upstream: globalThis.Response | undefined;
      try {
        upstream = await sdkFetch(buildMeUrl(base), {
          method: 'GET',
          headers,
          redirect: 'manual',
        });
      } catch {
        if (config.requireAuth) {
          res.status(401).json({ code: 'UNAUTHORIZED' });
          return;
        }
        next();
        return;
      }

      const setCookieValues = upstream.headers.getSetCookie?.() ?? [];
      for (const value of setCookieValues) {
        appendSetCookie(res, rewriteSetCookieDomain(value, originalHost));
      }

      if (upstream.ok) {
        try {
          ctx.user = (await upstream.json()) as IUser;
        } catch {
          ctx.user = null;
        }
      }
    }

    if (!ctx.user) {
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

    if (resolveWorkspace) {
      ctx.workspace =
        (await resolveWorkspace({
          req,
          user: ctx.user,
          workspaces: ctx.workspaces,
        })) || null;
    } else {
      // `/api/me` carries `user.workspace` (`{ _id, name, roles }`) only when
      // the user has activated a workspace. Null means the frontend must
      // prompt to activate/create one — don't silently pick workspaces[0].
      ctx.workspace =
        (ctx.user as unknown as { workspace?: IWorkspace | null }).workspace || null;
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
