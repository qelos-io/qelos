import QelosSDK from '@qelos/sdk';
import type { QelosSDKOptions, FetchLike } from '@qelos/sdk/types';
import { getCookie, getRequestHeader, type H3Event } from 'h3';
import type { QelosNuxtRuntimeConfig } from './types';

const DEFAULT_ACCESS_COOKIE = 'q_access_token';

export interface CreateSdkParams {
  config: QelosNuxtRuntimeConfig;
  event: H3Event;
}

const NO_AUTH_URLS = new Set([
  '/api/token/refresh',
  '/api/cookie/refresh',
  '/api/signin',
  '/api/signup',
]);

export function createRequestSdk({ config, event }: CreateSdkParams): QelosSDK {
  const baseOptions: Partial<QelosSDKOptions> = config.sdkOptions || {};
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;

  const options: QelosSDKOptions = {
    appUrl: config.appUrl,
    fetch: (globalThis.fetch as unknown as FetchLike),
    forceRefresh: !config.apiToken,
    ...baseOptions,
  };

  if (config.apiToken) {
    options.apiToken = config.apiToken;
    return new QelosSDK(options);
  }

  options.extraHeaders = async (relativeUrl: string) => {
    if (NO_AUTH_URLS.has(relativeUrl)) {
      return {};
    }
    const headers: Record<string, string> = {};
    const cookieHeader = getRequestHeader(event, 'cookie');
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }
    const accessToken = getCookie(event, accessCookie);
    if (accessToken) {
      headers.authorization = 'Bearer ' + accessToken;
    }
    return headers;
  };

  return new QelosSDK(options);
}
