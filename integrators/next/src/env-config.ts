import type { QelosNextConfig } from './types';

/**
 * Build a {@link QelosNextConfig} from `process.env`. Used by the
 * convention-over-configuration entry points (`qelosMiddleware`, the
 * no-arg `getQelosContext()`) so consumers can re-export the integrator
 * without writing a factory call.
 *
 * Recognized variables:
 *
 * - `QELOS_APP_URL` (required) — Qelos backend base URL.
 * - `QELOS_API_TOKEN` — service-to-service token (skips refresh logic).
 * - `QELOS_ACCESS_TOKEN_COOKIE` — defaults to `q_access_token`.
 * - `QELOS_REFRESH_TOKEN_COOKIE` — defaults to `q_refresh_token`.
 * - `QELOS_REQUIRE_AUTH` — `"true"` to reject anonymous requests.
 * - `QELOS_SKIP_PATHS` — comma-separated path prefixes to bypass.
 */
export function loadQelosConfigFromEnv(env: NodeJS.ProcessEnv = process.env): QelosNextConfig {
  const appUrl = env.QELOS_APP_URL;
  if (!appUrl) {
    throw new Error(
      '@qelos/integrator-next: QELOS_APP_URL is required when using the default ' +
        'qelosMiddleware / getQelosContext() exports. Set it in your environment ' +
        'or call createQelosMiddleware({ config: ... }) explicitly.'
    );
  }
  const config: QelosNextConfig = { appUrl };
  if (env.QELOS_API_TOKEN) config.apiToken = env.QELOS_API_TOKEN;
  if (env.QELOS_ACCESS_TOKEN_COOKIE) config.accessTokenCookie = env.QELOS_ACCESS_TOKEN_COOKIE;
  if (env.QELOS_REFRESH_TOKEN_COOKIE) config.refreshTokenCookie = env.QELOS_REFRESH_TOKEN_COOKIE;
  if (env.QELOS_REQUIRE_AUTH === 'true' || env.QELOS_REQUIRE_AUTH === '1') {
    config.requireAuth = true;
  }
  if (env.QELOS_SKIP_PATHS) {
    config.skipPaths = env.QELOS_SKIP_PATHS.split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return config;
}

let cachedConfig: QelosNextConfig | null = null;

/**
 * Return the env-derived config, memoized after the first call. The cache is
 * scoped to the current Node process — Next.js dev-mode reloads create a new
 * module instance, so changes to env vars are picked up on restart.
 */
export function getDefaultQelosConfig(): QelosNextConfig {
  if (!cachedConfig) {
    cachedConfig = loadQelosConfigFromEnv();
  }
  return cachedConfig;
}

/**
 * Reset the memoized env-derived config. Exported for tests; not part of the
 * stable surface.
 */
export function __resetDefaultQelosConfig(): void {
  cachedConfig = null;
}
