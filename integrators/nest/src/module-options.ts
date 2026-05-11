import type { QelosModuleOptions, QelosNestConfig } from './types';

function applyProxySkipPaths(config: QelosNestConfig): QelosNestConfig {
  if (config.disableProxy === true) return config;
  const existingSkipPaths = config.skipPaths ?? [];
  const alreadyCovered = existingSkipPaths.some((prefix) =>
    '/api/'.startsWith(prefix),
  );
  if (alreadyCovered) return config;
  return { ...config, skipPaths: ['/api/', ...existingSkipPaths] };
}

/**
 * `forRoot` / `forRootAsync` accept either a full {@link QelosModuleOptions}
 * object or a shorthand {@link QelosNestConfig} (same shape as Express
 * `createQelosMiddleware({ config })`).
 *
 * When `disableProxy` is not `true`, `/api/` is prepended to `skipPaths` so
 * the user resolver does not shadow the `/api/**` proxy.
 */
export function normalizeModuleOptions(
  input: QelosNestConfig | QelosModuleOptions,
): QelosModuleOptions {
  let wrapped: QelosModuleOptions;
  if (
    input !== null &&
    typeof input === 'object' &&
    'config' in input &&
    (input as QelosModuleOptions).config !== undefined &&
    typeof (input as QelosModuleOptions).config === 'object' &&
    (input as QelosModuleOptions).config !== null &&
    'appUrl' in (input as QelosModuleOptions).config
  ) {
    wrapped = input as QelosModuleOptions;
  } else {
    wrapped = { config: input as QelosNestConfig };
  }
  const mergedConfig = applyProxySkipPaths(wrapped.config);
  if (mergedConfig === wrapped.config) return wrapped;
  return { ...wrapped, config: mergedConfig };
}
