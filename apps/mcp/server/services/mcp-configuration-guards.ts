import type { IMcpConfigurationMetadata } from '@qelos/global-types';

export function isMcpConfigurationEnabled(
  configuration: IMcpConfigurationMetadata | null | undefined,
): boolean {
  return configuration?.enabled === true;
}
