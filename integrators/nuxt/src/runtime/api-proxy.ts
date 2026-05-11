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
        '[@qelos/integrator-nuxt] Qelos API proxy is not configured. Set qelos.proxyTarget (or NUXT_QELOS_PROXY_TARGET / QELOS_IP / QELOS_API_IP in development).',
    });
  }

  const originalHost = getRequestHeader(event, 'host');
  const path = event.path.split('?')[0] ?? event.path;
  const target = joinURL(base, path);

  return proxyRequest(event, target, {
    fetch: globalThis.fetch,
    cookieDomainRewrite: { '*.qelos.app': originalHost ?? '' },
  });
});
