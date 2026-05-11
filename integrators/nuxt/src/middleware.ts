import {
  appendResponseHeader,
  createError,
  defineEventHandler,
  getCookie,
  getRequestHeader,
  type H3Event,
} from 'h3';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { rewriteSetCookieDomain } from './cookies';
import { resolveQelosProxyTarget } from './proxy-target';
import { createRequestSdk } from './sdk-factory';
import type {
  QelosNuxtRuntimeConfig,
  QelosRequestContext,
  QelosTokenPair,
  TokenRefreshHook,
} from './types';

const DEFAULT_ACCESS_COOKIE = 'q_access_token';
const DEFAULT_REFRESH_COOKIE = 'q_refresh_token';

export interface CreateMiddlewareOptions {
  config: QelosNuxtRuntimeConfig;
  /**
   * @deprecated The middleware now lets Qelos rotate session cookies via the
   * upstream `Set-Cookie` response from `/api/me`; this hook is no longer
   * invoked. Retained for backwards compatibility with the v4.0 surface.
   */
  onTokenRefresh?: TokenRefreshHook;
  /**
   * Resolve the active workspace for a request. Defaults to picking the first
   * workspace returned from `sdk.workspaces.getList()`.
   */
  resolveWorkspace?: (params: {
    event: H3Event;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

function readTokens(event: H3Event, config: QelosNuxtRuntimeConfig): QelosTokenPair {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;

  const cookieAccess = getCookie(event, accessCookie);
  const cookieRefresh = getCookie(event, refreshCookie);

  const authHeader = getRequestHeader(event, 'authorization');
  const headerAccess = authHeader && authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : undefined;

  return {
    accessToken: headerAccess || cookieAccess || undefined,
    refreshToken: cookieRefresh || undefined,
  };
}

function shouldSkip(event: H3Event, config: QelosNuxtRuntimeConfig): boolean {
  if (!config.skipPaths?.length) {
    return false;
  }
  const path = event.path || event.node?.req?.url || '';
  return config.skipPaths.some((prefix) => path.startsWith(prefix));
}

function buildMeUrl(base: string): string {
  return `${base.replace(/\/+$/, '')}/api/me`;
}

export function createQelosMiddleware(options: CreateMiddlewareOptions) {
  const { config, resolveWorkspace } = options;

  return defineEventHandler(async (event) => {
    if (shouldSkip(event, config)) {
      return;
    }

    const tokens = readTokens(event, config);
    const sdk = createRequestSdk({ config, tokens, event });

    const ctx: QelosRequestContext = {
      user: null,
      workspace: null,
      workspaces: [],
      sdk,
      tokens,
    };
    event.context.qelos = ctx;

    const base = resolveQelosProxyTarget(config);
    if (!base && !config.apiToken) {
      if (config.requireAuth) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
      }
      return;
    }

    if (base) {
      const headers: Record<string, string> = {};
      const cookieHeader = getRequestHeader(event, 'cookie');
      if (cookieHeader) headers.cookie = cookieHeader;
      const authHeader = getRequestHeader(event, 'authorization');
      if (authHeader) headers.authorization = authHeader;

      const originalHost = getRequestHeader(event, 'host');

      let response: Response | undefined;
      try {
        response = await fetch(buildMeUrl(base), {
          method: 'GET',
          headers,
          redirect: 'manual',
        });
      } catch {
        if (config.requireAuth) {
          throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
        }
        return;
      }

      const setCookieValues = response.headers.getSetCookie?.() ?? [];
      for (const value of setCookieValues) {
        appendResponseHeader(event, 'set-cookie', rewriteSetCookieDomain(value, originalHost));
      }

      if (response.ok) {
        try {
          ctx.user = (await response.json()) as IUser;
        } catch {
          ctx.user = null;
        }
      }
    }

    if (!ctx.user) {
      if (config.requireAuth) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
      }
      return;
    }

    try {
      ctx.workspaces = await sdk.workspaces.getList();
    } catch {
      ctx.workspaces = [];
    }

    if (ctx.workspaces.length) {
      if (resolveWorkspace) {
        ctx.workspace = await resolveWorkspace({
          event,
          user: ctx.user,
          workspaces: ctx.workspaces,
        }) || null;
      } else {
        ctx.workspace = ctx.workspaces[0] || null;
      }
    }
  });
}

export type QelosMiddleware = ReturnType<typeof createQelosMiddleware>;
