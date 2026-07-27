import QelosSDK from '@qelos/sdk';
import QelosAdministratorSDK from '@qelos/sdk/administrator';
import { gatewayUrl } from '../../config';
import type { McpUserContext } from '../types';

export interface McpSdkCredentials {
  authorization?: string;
  apiKey?: string;
}

export interface McpSdkContext {
  sdk: QelosSDK;
  adminSdk: QelosAdministratorSDK | null;
}

export interface CreateSdkContextOptions {
  tenant: string;
  user: McpUserContext;
  credentials: McpSdkCredentials;
}

export function isPrivilegedMcpUser(user: McpUserContext): boolean {
  return user.roles.includes('admin') || user.isPrivileged === true;
}

export function shouldUseAdministratorSdk(user: McpUserContext): boolean {
  return isPrivilegedMcpUser(user);
}

export function createSdkContext(options: CreateSdkContextOptions): McpSdkContext {
  const { tenant, user, credentials } = options;
  const useAdministratorSdk = shouldUseAdministratorSdk(user);

  const sdkOptions = {
    appUrl: gatewayUrl,
    fetch: globalThis.fetch.bind(globalThis),
    apiToken: credentials.apiKey,
    extraHeaders: async () => {
      const headers: Record<string, string> = { tenant };

      if (credentials.apiKey) {
        headers['x-api-key'] = credentials.apiKey;
      } else if (credentials.authorization) {
        headers.authorization = credentials.authorization;
      }

      return headers;
    },
    extraQueryParams: () => ({
      bypassAdmin: useAdministratorSdk ? 'true' : '',
    }),
  };

  if (useAdministratorSdk) {
    const adminSdk = new QelosAdministratorSDK(sdkOptions);
    return { sdk: adminSdk, adminSdk };
  }

  return {
    sdk: new QelosSDK(sdkOptions),
    adminSdk: null,
  };
}
