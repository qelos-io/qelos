// This file is registered as a Nuxt server handler by `module.ts`. It is
// bundled by Nitro, so `#imports` resolves at the consuming-app build time
// (not at this package's `tsc` build).
// @ts-ignore - resolved by Nitro
import { useRuntimeConfig } from '#imports';
import { createError, defineEventHandler } from 'h3';
// @ts-ignore - resolved by Nitro (transitive dep of Nuxt)
import { joinURL } from 'ufo';
import { getQelosMock } from '../mock.js';
import { serveFromMock } from '../mock-handler.js';
import { proxyToQelos } from '../proxy-handler.js';
import { resolveQelosProxyTarget } from '../proxy-target.js';
import type { QelosNuxtRuntimeConfig } from '../types.js';

export default defineEventHandler((event) => {
  const config = (useRuntimeConfig().qelos || {}) as QelosNuxtRuntimeConfig;
  if (getQelosMock(config).active) return serveFromMock(event, config);

  const base = resolveQelosProxyTarget(config);
  if (!base) {
    throw createError({
      statusCode: 503,
      statusMessage:
        '[@qelos/integrator-nuxt] Qelos API proxy is not configured. Set qelos.appUrl (or NUXT_QELOS_PROXY_TARGET / QELOS_IP / QELOS_API_IP in development).',
    });
  }

  return proxyToQelos(event, joinURL(base, event.path));
});
