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
import { rewriteSetCookieDomain } from './cookies';
import { fetchMeIdentity } from './me-client';
import { resolveQelosProxyTarget } from './proxy-target';
import { createRequestSdk } from './sdk-factory';
import { runWithQelosContext } from './context';
import type { QelosNextConfig, QelosRequestContext } from './types';

type CookieMap = Partial<Record<string, string>>;

interface RequestWithCookies extends IncomingMessage {
  cookies?: CookieMap;
}

function getAuthorization(req: RequestWithCookies): string | undefined {
  const authHeaderRaw = req.headers.authorization;
  const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;
  return authHeader ?? undefined;
}

function getCookieHeader(req: RequestWithCookies): string | undefined {
  const raw = req.headers.cookie;
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return (raw as string[]).join('; ');
  return undefined;
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
   * Resolve the active workspace for a request. Defaults to whatever
   * `/api/me` reports on `user.workspace` (the user's currently activated
   * workspace, or `null` when none is active).
   */
  resolveWorkspace?: (params: {
    req: RequestWithCookies;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

function requestHost(req: RequestWithCookies): string | null {
  const h = req.headers.host;
  return Array.isArray(h) ? h[0] ?? null : h ?? null;
}

async function buildContext(
  req: RequestWithCookies,
  res: ServerResponse,
  options: PagesIntegratorOptions
): Promise<{ ctx: QelosRequestContext }> {
  const { config, resolveWorkspace } = options;

  const getHeaders = () => ({
    cookie: getCookieHeader(req),
    authorization: getAuthorization(req),
  });

  const sdk = createRequestSdk({ config, getHeaders });
  const ctx: QelosRequestContext = {
    user: null,
    workspace: null,
    workspaces: [],
    sdk,
  };

  const base = resolveQelosProxyTarget(config);
  if (!base && !config.apiToken) {
    return { ctx };
  }

  if (!base) {
    return { ctx };
  }

  const h = getHeaders();
  const { response, user } = await fetchMeIdentity({
    base,
    cookie: h.cookie,
    authorization: h.authorization,
  });

  const host = requestHost(req);
  const setCookieValues = response.headers.getSetCookie?.() ?? [];
  for (const value of setCookieValues) {
    appendSetCookie(res, rewriteSetCookieDomain(value, host ?? undefined));
  }

  ctx.user = user;
  if (!ctx.user) {
    return { ctx };
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
    ctx.workspace =
      (ctx.user as unknown as { workspace?: IWorkspace | null }).workspace ||
      null;
  }

  return { ctx };
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

    const { ctx } = await buildContext(req, res, options);
    req.qelos = ctx;

    if (config.requireAuth && !ctx.user) {
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
      const emptySdk = null as unknown as QelosRequestContext['sdk'];
      const emptyCtx: QelosRequestContext = {
        user: null,
        workspace: null,
        workspaces: [],
        sdk: emptySdk,
      };
      return runWithQelosContext(emptyCtx, () =>
        handler(context, emptyCtx)
      ) as Promise<GetServerSidePropsResult<P>>;
    }

    const { ctx } = await buildContext(req, res, options);
    req.qelos = ctx;

    if (config.requireAuth && !ctx.user) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    return (await runWithQelosContext(ctx, () => handler(context, ctx))) as GetServerSidePropsResult<P>;
  };
}
