import sdkModule from '@qelos/sdk';
import type QelosSDKInstance from '@qelos/sdk';
import type { QelosSDKOptions, FetchLike } from '@qelos/sdk/types';
import { getRequestHeader, type H3Event } from 'h3';
import { getQelosMock, MOCK_APP_URL } from './mock';
import type { QelosNuxtRuntimeConfig } from './types';

type QelosSdkCtor = new (options: QelosSDKOptions) => QelosSDKInstance;

// `@qelos/sdk` is CommonJS: depending on the loader (Node ESM, tsx, Nitro) the
// constructor is the module itself or nested under one/two `default` keys.
function resolveQelosSdkConstructor(): QelosSdkCtor {
  let current: unknown = sdkModule;
  for (let i = 0; i < 3; i++) {
    if (typeof current === 'function') return current as QelosSdkCtor;
    current = (current as { default?: unknown } | undefined)?.default;
  }
  throw new Error('[@qelos/integrator-nuxt] Could not resolve QelosSDK constructor from @qelos/sdk');
}

const QelosSDK = resolveQelosSdkConstructor();

export interface CreateSdkParams {
  config: QelosNuxtRuntimeConfig;
  event: H3Event;
}

export function createRequestSdk({ config, event }: CreateSdkParams): QelosSDKInstance {
  const baseOptions: Partial<QelosSDKOptions> = config.sdkOptions || {};

  const options: QelosSDKOptions = {
    appUrl: config.appUrl,
    fetch: (globalThis.fetch as unknown as FetchLike),
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
