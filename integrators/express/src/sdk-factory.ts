import type { Request } from 'express';
import QelosSDK from '@qelos/sdk';
import type { QelosSDKOptions, FetchLike } from '@qelos/sdk/types';
import type { QelosExpressConfig } from './types';

export interface CreateSdkParams {
  config: QelosExpressConfig;
  req: Request;
}

export function createRequestSdk({ config, req }: CreateSdkParams): QelosSDK {
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
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }
    const authHeader = req.headers.authorization;
    if (authHeader) {
      headers.authorization = authHeader;
    }
    return headers;
  };

  return new QelosSDK(options);
}
