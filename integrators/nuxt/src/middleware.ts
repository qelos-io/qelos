import {
  appendResponseHeader,
  createError,
  defineEventHandler,
  getRequestHeader,
  type H3Event,
} from 'h3';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { rewriteSetCookieDomain } from './cookies';
import { resolveQelosProxyTarget } from './proxy-target';
import { createRequestSdk } from './sdk-factory';
import type { QelosNuxtRuntimeConfig, QelosRequestContext } from './types';

export interface CreateMiddlewareOptions {
  config: QelosNuxtRuntimeConfig;
  /**
   * Resolve the active workspace for a request. Defaults to whatever
   * `/api/me` reports on `user.workspace` (the user's currently activated
   * workspace, or `null` when none is active).
   */
  resolveWorkspace?: (params: {
    event: H3Event;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
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

    const sdk = createRequestSdk({ config, event });

    const ctx: QelosRequestContext = {
      user: null,
      workspace: null,
      workspaces: [],
      sdk,
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

    if (resolveWorkspace) {
      ctx.workspace = (await resolveWorkspace({
        event,
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
}

export type QelosMiddleware = ReturnType<typeof createQelosMiddleware>;
