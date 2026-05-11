import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  preHandlerHookHandler,
} from 'fastify';
import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';
import fp from 'fastify-plugin';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { rewriteSetCookieDomain } from './cookies';
import { resolveQelosProxyTarget } from './proxy-target';
import { createRequestSdk } from './sdk-factory';
import type { QelosFastifyConfig, QelosRequestContext } from './types';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

export interface QelosPluginOptions {
  config: QelosFastifyConfig;
  /**
   * Resolve the active workspace for a request. Defaults to whatever
   * `/api/me` reports on `user.workspace` (the user's currently activated
   * workspace, or `null` when none is active).
   */
  resolveWorkspace?: (params: {
    request: FastifyRequest;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

export type QelosFastifyRegisterOptions =
  | QelosPluginOptions
  | (QelosFastifyConfig & Partial<Pick<QelosPluginOptions, 'resolveWorkspace'>>);

function normalizePluginOptions(
  options: QelosFastifyRegisterOptions,
): QelosPluginOptions {
  if (
    options &&
    typeof options === 'object' &&
    'config' in options &&
    options.config &&
    typeof options.config === 'object' &&
    typeof options.config.appUrl === 'string'
  ) {
    return options as QelosPluginOptions;
  }
  const o = options as QelosFastifyConfig &
    Partial<Pick<QelosPluginOptions, 'resolveWorkspace'>>;
  const { resolveWorkspace, ...configFields } = o;
  return {
    config: configFields as QelosFastifyConfig,
    resolveWorkspace,
  };
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

function buildMeUrl(base: string): string {
  return `${base.replace(/\/+$/, '')}/api/me`;
}

function appendSetCookie(reply: FastifyReply, value: string): void {
  // Fastify accumulates `set-cookie` values when `reply.header` is called
  // repeatedly, so a single append is enough — don't re-pass existing values.
  reply.header('set-cookie', value);
}

const qelosFastifyPlugin: FastifyPluginAsync<QelosFastifyRegisterOptions> = async (
  fastify: FastifyInstance,
  rawOptions: QelosFastifyRegisterOptions,
) => {
  const { config: rawConfig, resolveWorkspace } = normalizePluginOptions(rawOptions);

  const proxyEnabled = rawConfig.disableProxy !== true;
  let config = rawConfig;
  if (proxyEnabled) {
    const existingSkipPaths = rawConfig.skipPaths ?? [];
    const alreadyCovered = existingSkipPaths.some((prefix) =>
      '/api/'.startsWith(prefix),
    );
    if (!alreadyCovered) {
      config = { ...rawConfig, skipPaths: ['/api/', ...existingSkipPaths] };
    }
  }

  const sdkFetch = (config.sdkOptions?.fetch ?? globalThis.fetch) as typeof globalThis.fetch;

  fastify.addHook('preHandler', async (request, reply) => {
    if (shouldSkip(request, config)) {
      return;
    }

    const sdk = createRequestSdk({ config, request });

    const ctx: QelosRequestContext = {
      user: null,
      workspace: null,
      workspaces: [],
      sdk,
    };
    request.qelos = ctx;

    const base = resolveQelosProxyTarget(config);
    if (!base && !config.apiToken) {
      if (config.requireAuth) {
        return reply.code(401).send({ code: 'UNAUTHORIZED' });
      }
      return;
    }

    if (base) {
      const headers: Record<string, string> = {};
      if (request.headers.cookie) headers.cookie = request.headers.cookie;
      if (request.headers.authorization) {
        headers.authorization = request.headers.authorization;
      }

      const originalHost = request.headers.host;

      let upstream: globalThis.Response | undefined;
      try {
        upstream = await sdkFetch(buildMeUrl(base), {
          method: 'GET',
          headers,
          redirect: 'manual',
        });
      } catch {
        if (config.requireAuth) {
          return reply.code(401).send({ code: 'UNAUTHORIZED' });
        }
        return;
      }

      const setCookieValues = upstream.headers.getSetCookie?.() ?? [];
      for (const value of setCookieValues) {
        appendSetCookie(reply, rewriteSetCookieDomain(value, originalHost));
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
        return reply.code(401).send({ code: 'UNAUTHORIZED' });
      }
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
          request,
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
  });

  if (proxyEnabled) {
    fastify.all('/api/*', (request, reply) => {
      proxyApiRequest(request, reply, config);
    });
  }
};

function proxyApiRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  config: QelosFastifyConfig,
): void {
  const base = resolveQelosProxyTarget(config);
  if (!base) {
    reply.code(503).send({
      code: 'QELOS_PROXY_NOT_CONFIGURED',
      message:
        '[@qelos/integrator-fastify] Qelos API proxy is not configured. ' +
        'Set config.appUrl (or QELOS_PROXY_TARGET / QELOS_IP / QELOS_API_IP in development).',
    });
    return;
  }

  let target: URL;
  try {
    const baseUrl = new URL(base);
    target = new URL(request.url, baseUrl);
  } catch {
    reply.code(502).send({
      code: 'QELOS_PROXY_BAD_TARGET',
      message: '[@qelos/integrator-fastify] Invalid proxy target URL.',
    });
    return;
  }

  const client = target.protocol === 'https:' ? https : http;
  const originalHost = request.headers.host;

  const forwardedHeaders: http.OutgoingHttpHeaders = {};
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    if (HOP_BY_HOP.has(name.toLowerCase())) continue;
    forwardedHeaders[name] = value as string | string[];
  }
  forwardedHeaders.host = target.host;

  const upstreamReq = client.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      method: request.method,
      path: target.pathname + target.search,
      headers: forwardedHeaders,
    },
    (upstreamRes) => {
      const status = upstreamRes.statusCode ?? 502;
      const raw = reply.raw;
      for (const [name, value] of Object.entries(upstreamRes.headers)) {
        if (value === undefined) continue;
        const lower = name.toLowerCase();
        if (HOP_BY_HOP.has(lower)) continue;
        if (lower === 'set-cookie') {
          const values = Array.isArray(value) ? value : [value];
          raw.setHeader(
            'set-cookie',
            values.map((v) => rewriteSetCookieDomain(v, originalHost)),
          );
          continue;
        }
        raw.setHeader(name, value);
      }
      raw.statusCode = status;
      upstreamRes.pipe(raw);
    },
  );

  upstreamReq.on('error', (err) => {
    if (!reply.raw.headersSent) {
      reply.code(502).send({
        code: 'QELOS_PROXY_UPSTREAM_ERROR',
        message: err.message,
      });
    } else {
      reply.raw.end();
    }
  });

  request.raw.on('aborted', () => upstreamReq.destroy());
  request.raw.pipe(upstreamReq);
}

export const qelosFastify = fp(qelosFastifyPlugin, {
  name: '@qelos/integrator-fastify',
  fastify: '4.x || 5.x',
});

/** Alias for {@link qelosFastify} — matches the documented usage name. */
export const qelosPlugin = qelosFastify;

export default qelosFastify;

/**
 * `preHandler` that responds with 401 when `request.qelos.user` is not
 * populated. Mount on a route after the plugin has been registered.
 */
export const requireUser: preHandlerHookHandler = async (request, reply) => {
  if (!request.qelos?.user) {
    return reply.code(401).send({ code: 'UNAUTHORIZED' });
  }
};
