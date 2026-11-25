import type { Request } from 'express';
import QelosSDK from '@qelos/sdk';
import type { QelosSDKOptions, FetchLike } from '@qelos/sdk/types';
import { getQelosMock, MOCK_APP_URL } from './mock';
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

  const mock = getQelosMock(config);
  if (mock.active) {
    options.appUrl = MOCK_APP_URL;
    options.fetch = mock.fetch as unknown as FetchLike;
  }

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
