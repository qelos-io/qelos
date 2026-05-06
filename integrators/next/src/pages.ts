import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  NextApiHandler,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { createRequestSdk } from './sdk-factory';
import { runWithQelosContext } from './context';
import type {
  QelosNextConfig,
  QelosRequestContext,
  QelosTokenPair,
  ResolvedTokens,
  TokenRefreshHook,
} from './types';

const DEFAULT_ACCESS_COOKIE = 'q_access_token';
const DEFAULT_REFRESH_COOKIE = 'q_refresh_token';

type CookieMap = Partial<Record<string, string>>;

interface RequestWithCookies extends IncomingMessage {
  cookies?: CookieMap;
}

function readCookieFromHeader(header: string | undefined, name: string): string | undefined {
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
  req: RequestWithCookies,
  config: QelosNextConfig
): QelosTokenPair {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const parsed = req.cookies;
  const cookieAccess =
    (parsed && typeof parsed[accessCookie] === 'string'
      ? parsed[accessCookie]
      : undefined) || readCookieFromHeader(req.headers.cookie, accessCookie);
  const cookieRefresh =
    (parsed && typeof parsed[refreshCookie] === 'string'
      ? parsed[refreshCookie]
      : undefined) || readCookieFromHeader(req.headers.cookie, refreshCookie);
  const authHeaderRaw = req.headers.authorization;
  const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;
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

function appendSetCookie(res: ServerResponse, value: string): void {
  const existing = res.getHeader('set-cookie');
  if (Array.isArray(existing)) {
    res.setHeader('set-cookie', [...existing, value]);
  } else if (typeof existing === 'string') {
    res.setHeader('set-cookie', [existing, value]);
  } else {
    res.setHeader('set-cookie', [value]);
  }
}

function writeTokensToResponse(
  res: ServerResponse,
  config: QelosNextConfig,
  tokens: ResolvedTokens
): void {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const secure = !/^http:\/\//i.test(config.appUrl);
  appendSetCookie(res, serializeCookie(accessCookie, tokens.accessToken, secure));
  if (tokens.refreshToken) {
    appendSetCookie(res, serializeCookie(refreshCookie, tokens.refreshToken, secure));
  }
}

function shouldSkip(req: RequestWithCookies, config: QelosNextConfig): boolean {
  if (!config.skipPaths?.length) return false;
  const path = req.url || '';
  return config.skipPaths.some((prefix) => path.startsWith(prefix));
}

declare module 'http' {
  interface IncomingMessage {
    qelos?: QelosRequestContext;
  }
}

export interface PagesIntegratorOptions {
  config: QelosNextConfig;
  /**
   * Hook invoked after a successful token refresh. The default implementation
   * writes the new tokens back to the response cookies.
   */
  onTokenRefresh?: TokenRefreshHook<ServerResponse>;
  /**
   * Resolve the active workspace for a request. Defaults to picking the first
   * workspace returned from `sdk.workspaces.getList()`.
   */
  resolveWorkspace?: (params: {
    req: RequestWithCookies;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

async function buildContext(
  req: RequestWithCookies,
  res: ServerResponse,
  options: PagesIntegratorOptions
): Promise<{ ctx: QelosRequestContext; identifyFailed: boolean }> {
  const { config, resolveWorkspace } = options;
  const onTokenRefresh: TokenRefreshHook<ServerResponse> =
    options.onTokenRefresh ||
    (async ({ target, newTokens }) => {
      writeTokensToResponse(target, config, newTokens);
    });

  const tokens = readTokens(req, config);
  const sdk = createRequestSdk<ServerResponse>({
    config,
    tokens,
    refreshTarget: res,
    onTokenRefresh,
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
    return { ctx, identifyFailed: false };
  }

  let identifyFailed = false;
  try {
    ctx.user = await sdk.authentication.getLoggedInUser();
  } catch {
    identifyFailed = true;
    return { ctx, identifyFailed };
  }

  if (!ctx.user) return { ctx, identifyFailed };

  try {
    ctx.workspaces = await sdk.workspaces.getList();
  } catch {
    ctx.workspaces = [];
  }

  if (ctx.workspaces.length) {
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

  return { ctx, identifyFailed };
}

/**
 * Wrap a Pages Router API route handler so that `req.qelos` is populated
 * before the handler runs. Anonymous requests pass through with
 * `req.qelos.user = null` unless `config.requireAuth` is set.
 */
export function withQelosApi(
  handler: NextApiHandler,
  options: PagesIntegratorOptions
): NextApiHandler {
  const { config } = options;
  return async function qelosApiHandler(
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    if (shouldSkip(req, config)) {
      return handler(req, res);
    }

    const { ctx, identifyFailed } = await buildContext(req, res, options);
    req.qelos = ctx;

    if (config.requireAuth && (!ctx.user || identifyFailed)) {
      res.status(401).json({ code: 'UNAUTHORIZED' });
      return;
    }

    await runWithQelosContext(ctx, () => handler(req, res));
  };
}

/**
 * Wrap a Pages Router API route handler so that requests without a resolved
 * user are rejected with `401`. The handler always sees a populated
 * `req.qelos.user`.
 */
export function requireQelosApiUser(
  handler: NextApiHandler,
  options: PagesIntegratorOptions
): NextApiHandler {
  return withQelosApi(handler, { ...options, config: { ...options.config, requireAuth: true } });
}

/**
 * Wrap a Pages Router `getServerSideProps` so that `context.req.qelos` is
 * populated and the resolved context is also passed as a second argument for
 * convenience.
 */
export function withQelosSSR<P extends { [key: string]: any } = { [key: string]: any }>(
  handler: (
    context: GetServerSidePropsContext,
    qelos: QelosRequestContext
  ) => Promise<GetServerSidePropsResult<P>> | GetServerSidePropsResult<P>,
  options: PagesIntegratorOptions
): GetServerSideProps<P> {
  const { config } = options;
  return async function qelosGetServerSideProps(context) {
    const req = context.req as RequestWithCookies;
    const res = context.res as ServerResponse;

    if (shouldSkip(req, config)) {
      return runWithQelosContext(
        { user: null, workspace: null, workspaces: [], sdk: null as never, tokens: {} },
        () =>
          handler(context, {
            user: null,
            workspace: null,
            workspaces: [],
            sdk: null as never,
            tokens: {},
          })
      ) as Promise<GetServerSidePropsResult<P>>;
    }

    const { ctx, identifyFailed } = await buildContext(req, res, options);
    req.qelos = ctx;

    if (config.requireAuth && (!ctx.user || identifyFailed)) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    return (await runWithQelosContext(ctx, () => handler(context, ctx))) as GetServerSidePropsResult<P>;
  };
}
