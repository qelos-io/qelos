import {
  defineEventHandler,
  getCookie,
  getRequestHeader,
  setCookie,
  createError,
  type H3Event,
} from 'h3';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
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
   * Hook invoked after a successful token refresh. The default implementation
   * writes the new tokens back to the response cookies.
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

function writeTokensToCookies(
  event: H3Event,
  config: QelosNuxtRuntimeConfig,
  tokens: { accessToken: string; refreshToken?: string },
) {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
  };
  setCookie(event, accessCookie, tokens.accessToken, cookieOptions);
  if (tokens.refreshToken) {
    setCookie(event, refreshCookie, tokens.refreshToken, cookieOptions);
  }
}

function shouldSkip(event: H3Event, config: QelosNuxtRuntimeConfig): boolean {
  if (!config.skipPaths?.length) {
    return false;
  }
  const path = event.path || event.node?.req?.url || '';
  return config.skipPaths.some((prefix) => path.startsWith(prefix));
}

export function createQelosMiddleware(options: CreateMiddlewareOptions) {
  const { config, resolveWorkspace } = options;
  const onTokenRefresh: TokenRefreshHook = options.onTokenRefresh
    || (async ({ event, newTokens }) => {
      writeTokensToCookies(event, config, newTokens);
    });

  return defineEventHandler(async (event) => {
    if (shouldSkip(event, config)) {
      return;
    }

    const tokens = readTokens(event, config);
    const sdk = createRequestSdk({ config, tokens, event, onTokenRefresh });

    const ctx: QelosRequestContext = {
      user: null,
      workspace: null,
      workspaces: [],
      sdk,
      tokens,
    };
    event.context.qelos = ctx;

    const hasAuthMaterial = Boolean(config.apiToken || tokens.accessToken || tokens.refreshToken);
    if (!hasAuthMaterial) {
      if (config.requireAuth) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
      }
      return;
    }

    try {
      ctx.user = await sdk.authentication.getLoggedInUser();
    } catch (err) {
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

    if (ctx.user && ctx.workspaces.length) {
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
