import type { QelosModuleOptions, QelosNestConfig } from './types';

/**
 * `forRoot` / `forRootAsync` accept either a full {@link QelosModuleOptions}
 * object or a shorthand {@link QelosNestConfig} (same shape as Express
 * `createQelosMiddleware({ config })`).
 */
export function normalizeModuleOptions(
  input: QelosNestConfig | QelosModuleOptions,
): QelosModuleOptions {
  if (
    input !== null &&
    typeof input === 'object' &&
    'config' in input &&
    (input as QelosModuleOptions).config !== undefined &&
    typeof (input as QelosModuleOptions).config === 'object' &&
    (input as QelosModuleOptions).config !== null &&
    'appUrl' in (input as QelosModuleOptions).config
  ) {
    return input as QelosModuleOptions;
  }
  return { config: input as QelosNestConfig };
}
