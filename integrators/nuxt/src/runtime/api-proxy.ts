// This file is registered as a Nuxt server handler by `module.ts`. It is
// bundled by Nitro, so `#imports` resolves at the consuming-app build time
// (not at this package's `tsc` build).
// @ts-ignore - resolved by Nitro
import { useRuntimeConfig } from '#imports';
import {
  createError,
  defineEventHandler,
  getRequestHeader,
  proxyRequest,
} from 'h3';
// @ts-ignore - resolved by Nitro (transitive dep of Nuxt)
import { joinURL } from 'ufo';
import { resolveQelosProxyTarget } from '../proxy-target';
import type { QelosNuxtRuntimeConfig } from '../types';

export default defineEventHandler((event) => {
  const config = (useRuntimeConfig().qelos || {}) as QelosNuxtRuntimeConfig;
  const base = resolveQelosProxyTarget(config);
  if (!base) {
    throw createError({
      statusCode: 503,
      statusMessage:
        '[@qelos/integrator-nuxt] Qelos API proxy is not configured. Set qelos.proxyTarget or NUXT_QELOS_PROXY_TARGET (or QELOS_IP / QELOS_API_IP in development).',
    });
  }

  // `event.path` already includes the query string; preserve it so upstream
  // receives the original querystring untouched.
  const target = joinURL(base, event.path);
  const originalHost = getRequestHeader(event, 'host');
  const targetHost = new URL(base).host;

  const cookieDomainRewrite: Record<string, string> = {
    '*.qelos.app': originalHost ?? '',
  };
  if (originalHost) {
    cookieDomainRewrite[targetHost] = originalHost;
    cookieDomainRewrite['.' + targetHost] = originalHost;
  }

  return proxyRequest(event, target, {
    fetch: globalThis.fetch,
    cookieDomainRewrite,
  });
});
