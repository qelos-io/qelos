import type { FastifyRequest } from 'fastify';
import QelosSDK from '@qelos/sdk';
import type { QelosSDKOptions, FetchLike } from '@qelos/sdk/types';
import type { QelosFastifyConfig } from './types';

export interface CreateSdkParams {
  config: QelosFastifyConfig;
  request: FastifyRequest;
}

export function createRequestSdk({ config, request }: CreateSdkParams): QelosSDK {
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
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }
    const authHeader = request.headers.authorization;
    if (authHeader) {
      headers.authorization = authHeader;
    }
    return headers;
  };

  return new QelosSDK(options);
}
