import type { QelosNuxtRuntimeConfig } from './types';

/**
 * Resolve the origin to which `/api/**` requests should be proxied.
 *
 * Priority (highest first):
 *   1. `config.proxyTarget`
 *   2. `process.env.NUXT_QELOS_PROXY_TARGET`
 *   3. `process.env.QELOS_IP`
 *   4. `process.env.QELOS_API_IP`
 *   5. `config.appUrl`
 *
 * Empty / whitespace-only values are skipped, and `undefined` is returned when
 * nothing is configured so the caller can surface a clear error.
 */
export function resolveQelosProxyTarget(
  config: QelosNuxtRuntimeConfig,
): string | undefined {
  const fromConfig = config.proxyTarget?.trim();
  if (fromConfig) return fromConfig;

  const env = process.env;
  const fromEnv =
    env.NUXT_QELOS_PROXY_TARGET?.trim() ||
    env.QELOS_IP?.trim() ||
    env.QELOS_API_IP?.trim();
  if (fromEnv) return fromEnv;

  const fromAppUrl = config.appUrl?.trim();
  return fromAppUrl || undefined;
}
