import type { RequestHandler } from 'express';
import { createQelosMiddleware, type CreateMiddlewareOptions } from './middleware';
import { createQelosProxy } from './proxy';
import type { QelosExpressConfig } from './types';

export {
  createQelosMiddleware,
  requireUser,
} from './middleware';
export type {
  CreateMiddlewareOptions,
  QelosMiddleware,
} from './middleware';

export { createQelosProxy } from './proxy';
export type { CreateProxyOptions, QelosProxyHandler } from './proxy';

export { createRequestSdk } from './sdk-factory';
export type { CreateSdkParams } from './sdk-factory';

export { rewriteSetCookieDomain, rewriteSetCookieDomains } from './cookies';
export { resolveQelosProxyTarget } from './proxy-target';

export type {
  QelosExpressConfig,
  QelosRequestContext,
} from './types';

export {
  completeSocialAuthCallback,
  getSocialAuthSetCookieParts,
  parseSocialCallbackRefreshToken,
  type SocialAuthCallbackPayload,
  type SocialCallbackInput,
} from './social-auth';

export interface QelosIntegrator {
  /**
   * User-resolution middleware. Forwards inbound cookies to `/api/me` and
   * exposes `req.qelos.user` / `req.qelos.workspace` / `req.qelos.workspaces`
   * / `req.qelos.sdk`.
   */
  middleware: RequestHandler;
  /**
   * Catch-all reverse-proxy handler for `/api/**`. Mount it AFTER your own
   * `/api/*` routes so user-defined endpoints still take precedence. Returns
   * `null` when `config.disableProxy === true`.
   */
  proxy: RequestHandler | null;
}

/**
 * Build both the user-resolution middleware and the `/api/**` reverse proxy
 * from a single config. When the proxy is enabled (the default), `/api/` is
 * auto-prepended to `skipPaths` so the middleware doesn't shadow the proxy
 * by running its own `/api/me` probe on every proxied request.
 */
export function createQelosIntegrator(
  options: CreateMiddlewareOptions,
): QelosIntegrator {
  const proxyEnabled = options.config.disableProxy !== true;

  let config: QelosExpressConfig = options.config;
  if (proxyEnabled) {
    const existingSkipPaths = options.config.skipPaths ?? [];
    const alreadyCovered = existingSkipPaths.some((prefix) => '/api/'.startsWith(prefix));
    if (!alreadyCovered) {
      config = { ...options.config, skipPaths: ['/api/', ...existingSkipPaths] };
    }
  }

  const middleware = createQelosMiddleware({ ...options, config });
  const proxy = proxyEnabled ? createQelosProxy({ config }) : null;

  return { middleware, proxy };
}
