import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from 'fastify';
import fp from 'fastify-plugin';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { createRequestSdk } from './sdk-factory';
import type {
  QelosFastifyConfig,
  QelosRequestContext,
  QelosTokenPair,
  ResolvedTokens,
  TokenRefreshHook,
} from './types';

const DEFAULT_ACCESS_COOKIE = 'q_access_token';
const DEFAULT_REFRESH_COOKIE = 'q_refresh_token';

export interface QelosPluginOptions {
  config: QelosFastifyConfig;
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
    request: FastifyRequest;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

function readCookie(request: FastifyRequest, name: string): string | undefined {
  // Prefer @fastify/cookie's parsed output when available.
  const parsed = (request as FastifyRequest & {
    cookies?: Record<string, string | undefined>;
  }).cookies;
  if (parsed && typeof parsed[name] === 'string') {
    return parsed[name];
  }
  const header = request.headers.cookie;
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

function readTokens(
  request: FastifyRequest,
  config: QelosFastifyConfig,
): QelosTokenPair {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const cookieAccess = readCookie(request, accessCookie);
  const cookieRefresh = readCookie(request, refreshCookie);
  const authHeader = request.headers.authorization;
  const headerAccess =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  return {
    accessToken: headerAccess || cookieAccess || undefined,
    refreshToken: cookieRefresh || undefined,
  };
}

function serializeCookie(name: string, value: string, secure: boolean): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function appendSetCookie(reply: FastifyReply, value: string): void {
  const existing = reply.getHeader('set-cookie');
  if (Array.isArray(existing)) {
    reply.header('set-cookie', [...existing, value]);
  } else if (typeof existing === 'string') {
    reply.header('set-cookie', [existing, value]);
  } else if (typeof existing === 'number') {
    reply.header('set-cookie', [String(existing), value]);
  } else {
    reply.header('set-cookie', [value]);
  }
}

function writeTokensToCookies(
  reply: FastifyReply,
  config: QelosFastifyConfig,
  tokens: ResolvedTokens,
): void {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const secure = !/^http:\/\//i.test(config.appUrl);

  // Prefer @fastify/cookie's reply.setCookie when present so consumer
  // cookie settings/middleware (e.g. signed cookies) keep working.
  type CookieReply = FastifyReply & {
    setCookie?: (
      name: string,
      value: string,
      options: Record<string, unknown>,
    ) => FastifyReply;
  };
  const cookieReply = reply as CookieReply;
  if (typeof cookieReply.setCookie === 'function') {
    const cookieOptions = {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
    };
    cookieReply.setCookie(accessCookie, tokens.accessToken, cookieOptions);
    if (tokens.refreshToken) {
      cookieReply.setCookie(refreshCookie, tokens.refreshToken, cookieOptions);
    }
    return;
  }

  appendSetCookie(reply, serializeCookie(accessCookie, tokens.accessToken, secure));
  if (tokens.refreshToken) {
    appendSetCookie(reply, serializeCookie(refreshCookie, tokens.refreshToken, secure));
  }
}

function shouldSkip(
  request: FastifyRequest,
  config: QelosFastifyConfig,
): boolean {
  if (!config.skipPaths?.length) return false;
  const url = request.url || '';
  const queryIdx = url.indexOf('?');
  const path = queryIdx >= 0 ? url.slice(0, queryIdx) : url;
  return config.skipPaths.some((prefix) => path.startsWith(prefix));
}

const qelosFastifyPlugin: FastifyPluginAsync<QelosPluginOptions> = async (
  fastify: FastifyInstance,
  options: QelosPluginOptions,
) => {
  const { config, resolveWorkspace } = options;
  const onTokenRefresh: TokenRefreshHook =
    options.onTokenRefresh ||
    (async ({ reply, newTokens }) => {
      writeTokensToCookies(reply, config, newTokens);
    });

  fastify.addHook('preHandler', async (request, reply) => {
    if (shouldSkip(request, config)) {
      return;
    }

    const tokens = readTokens(request, config);
    const sdk = createRequestSdk({ config, tokens, request, reply, onTokenRefresh });

    const ctx: QelosRequestContext = {
      user: null,
      workspace: null,
      workspaces: [],
      sdk,
      tokens,
    };
    request.qelos = ctx;

    const hasAuthMaterial = Boolean(
      config.apiToken || tokens.accessToken || tokens.refreshToken,
    );
    if (!hasAuthMaterial) {
      if (config.requireAuth) {
        reply.code(401).send({ code: 'UNAUTHORIZED' });
        return reply;
      }
      return;
    }

    try {
      ctx.user = await sdk.authentication.getLoggedInUser();
    } catch {
      if (config.requireAuth) {
        reply.code(401).send({ code: 'UNAUTHORIZED' });
        return reply;
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
        ctx.workspace =
          (await resolveWorkspace({
            request,
            user: ctx.user,
            workspaces: ctx.workspaces,
          })) || null;
      } else {
        ctx.workspace = ctx.workspaces[0] || null;
      }
    }
  });
};

export const qelosFastify = fp(qelosFastifyPlugin, {
  name: '@qelos/integrator-fastify',
  fastify: '4.x || 5.x',
});

export default qelosFastify;

/**
 * Build a `preHandler` hook that responds with 401 when `request.qelos.user`
 * is not populated. Mount on a route after the plugin has been registered.
 */
export const requireUser: preHandlerHookHandler = async (request, reply) => {
  if (!request.qelos || !request.qelos.user) {
    reply.code(401).send({ code: 'UNAUTHORIZED' });
    return reply;
  }
};
