import QelosSDK from '@qelos/sdk';
import type { FetchLike, QelosSDKOptions } from '@qelos/sdk/types';
import type { AnyRequest, QelosNestConfig } from './types';

export interface CreateSdkParams {
  config: QelosNestConfig;
  request: AnyRequest;
}

export function createRequestSdk({
  config,
  request,
}: CreateSdkParams): QelosSDK {
  const baseOptions: Partial<QelosSDKOptions> = config.sdkOptions || {};

  const options: QelosSDKOptions = {
    appUrl: config.appUrl,
    fetch: globalThis.fetch as unknown as FetchLike,
    ...baseOptions,
  };

  if (config.apiToken) {
    options.apiToken = config.apiToken;
    return new QelosSDK(options);
  }

  options.extraHeaders = async () => {
    const headers: Record<string, string> = {};
    const cookieHeader = request.headers.cookie;
    const cookie =
      typeof cookieHeader === 'string'
        ? cookieHeader
        : Array.isArray(cookieHeader)
          ? cookieHeader.join('; ')
          : undefined;
    if (cookie) {
      headers.cookie = cookie;
    }
    const rawAuth = request.headers.authorization;
    const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
    if (authHeader) {
      headers.authorization = authHeader;
    }
    return headers;
  };

  return new QelosSDK(options);
}
