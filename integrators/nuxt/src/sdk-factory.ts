import QelosSDK from '@qelos/sdk';
import type { QelosSDKOptions, FetchLike } from '@qelos/sdk/types';
import { getRequestHeader, type H3Event } from 'h3';
import type { QelosNuxtRuntimeConfig } from './types';

export interface CreateSdkParams {
  config: QelosNuxtRuntimeConfig;
  event: H3Event;
}

export function createRequestSdk({ config, event }: CreateSdkParams): QelosSDK {
  const baseOptions: Partial<QelosSDKOptions> = config.sdkOptions || {};

  const options: QelosSDKOptions = {
    appUrl: config.appUrl,
    fetch: (globalThis.fetch as unknown as FetchLike),
    ...baseOptions,
  };

  if (config.apiToken) {
    options.apiToken = config.apiToken;
    return new QelosSDK(options);
  }

  options.extraHeaders = async () => {
    const headers: Record<string, string> = {};
    const cookieHeader = getRequestHeader(event, 'cookie');
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }
    const authHeader = getRequestHeader(event, 'authorization');
    if (authHeader) {
      headers.authorization = authHeader;
    }
    return headers;
  };

  return new QelosSDK(options);
}
