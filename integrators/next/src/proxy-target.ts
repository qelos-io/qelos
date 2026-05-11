import type { QelosNextConfig } from './types';

/**
 * Resolve the origin to which `/api/**` requests are proxied. The managed
 * Qelos app URL (`config.appUrl`) is the proxy target — env vars are only
 * dev-time overrides when the configured `appUrl` is not reachable from
 * the local host.
 *
 * Priority (highest first):
 *   1. `process.env.NEXT_QELOS_PROXY_TARGET`
 *   2. `process.env.QELOS_IP`
 *   3. `process.env.QELOS_API_IP`
 *   4. `config.appUrl`
 *
 * Empty / whitespace-only values are skipped, and `undefined` is returned when
 * nothing is configured so the caller can surface a clear error.
 */
export function resolveQelosProxyTarget(
  config: QelosNextConfig,
): string | undefined {
  const env = process.env;
  const fromEnv =
    env.NEXT_QELOS_PROXY_TARGET?.trim() ||
    env.QELOS_IP?.trim() ||
    env.QELOS_API_IP?.trim();
  if (fromEnv) return fromEnv;

  const fromAppUrl = config.appUrl?.trim();
  return fromAppUrl || undefined;
}
