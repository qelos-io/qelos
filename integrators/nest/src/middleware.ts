import {
  Inject,
  Injectable,
  UnauthorizedException,
  type NestMiddleware,
} from '@nestjs/common';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import { QELOS_MODULE_OPTIONS } from './constants';
import { rewriteSetCookieDomain } from './cookies';
import { resolveQelosProxyTarget } from './proxy-target';
import { appendSetCookie, shouldSkip } from './request-utils';
import { createRequestSdk } from './sdk-factory';
import type {
  AnyRequest,
  AnyResponse,
  QelosModuleOptions,
  QelosRequestContext,
} from './types';

function buildMeUrl(base: string): string {
  return `${base.replace(/\/+$/, '')}/api/me`;
}

@Injectable()
export class QelosMiddleware implements NestMiddleware {
  constructor(
    @Inject(QELOS_MODULE_OPTIONS)
    private readonly options: QelosModuleOptions,
  ) {}

  async use(req: unknown, res: unknown, next: (err?: unknown) => void): Promise<void> {
    const request = req as AnyRequest;
    const response = res as AnyResponse;
    const { config, resolveWorkspace } = this.options;
    const sdkFetch = (config.sdkOptions?.fetch ?? globalThis.fetch) as typeof globalThis.fetch;

    if (shouldSkip(request, config)) {
      next();
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
        next(new UnauthorizedException());
        return;
      }
      next();
      return;
    }

    if (base) {
      const headers: Record<string, string> = {};
      const cookieHeader = request.headers.cookie;
      const cookie =
        typeof cookieHeader === 'string'
          ? cookieHeader
          : Array.isArray(cookieHeader)
            ? cookieHeader.join('; ')
            : undefined;
      if (cookie) headers.cookie = cookie;
      const rawAuth = request.headers.authorization;
      const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
      if (authHeader) headers.authorization = authHeader;

      const hostHeader = request.headers.host;
      const originalHost =
        typeof hostHeader === 'string'
          ? hostHeader
          : Array.isArray(hostHeader)
            ? hostHeader[0]
            : undefined;

      let upstream: globalThis.Response | undefined;
      try {
        upstream = await sdkFetch(buildMeUrl(base), {
          method: 'GET',
          headers,
          redirect: 'manual',
        });
      } catch {
        if (config.requireAuth) {
          next(new UnauthorizedException());
          return;
        }
        next();
        return;
      }

      const setCookieValues = upstream.headers.getSetCookie?.() ?? [];
      for (const value of setCookieValues) {
        appendSetCookie(response, rewriteSetCookieDomain(value, originalHost));
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
        next(new UnauthorizedException());
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
          request,
          user: ctx.user,
          workspaces: ctx.workspaces,
        })) || null;
    } else {
      ctx.workspace =
        (ctx.user as unknown as { workspace?: IWorkspace | null }).workspace ||
        null;
    }

    next();
  }
}
