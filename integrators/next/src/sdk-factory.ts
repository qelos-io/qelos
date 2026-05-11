import sdkModule from '@qelos/sdk';
import type QelosSDKInstance from '@qelos/sdk';
import type { QelosSDKOptions, FetchLike } from '@qelos/sdk/types';
import type { QelosNextConfig } from './types';

type QelosSdkCtor = new (options: QelosSDKOptions) => QelosSDKInstance;

function resolveQelosSdkConstructor(): QelosSdkCtor {
  const top = sdkModule as unknown;
  if (typeof top === 'function') {
    return top as QelosSdkCtor;
  }
  const once = (top as { default?: unknown }).default;
  if (typeof once === 'function') {
    return once as QelosSdkCtor;
  }
  const twice = (once as { default?: unknown } | undefined)?.default;
  if (typeof twice === 'function') {
    return twice as QelosSdkCtor;
  }
  throw new Error(
    '[@qelos/integrator-next] Could not resolve QelosSDK constructor from @qelos/sdk',
  );
}

const QelosSDK = resolveQelosSdkConstructor();

export interface CreateSdkParams {
  config: QelosNextConfig;
  /**
   * Live header source so every SDK call forwards the current request cookies
   * and `Authorization` (no mutable token state).
   */
  getHeaders: () =>
    | { cookie?: string; authorization?: string }
    | Promise<{ cookie?: string; authorization?: string }>;
}

export function createRequestSdk({
  config,
  getHeaders,
}: CreateSdkParams): QelosSDKInstance {
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
    const h = await getHeaders();
    const headers: Record<string, string> = {};
    if (h.cookie) headers.cookie = h.cookie;
    if (h.authorization) headers.authorization = h.authorization;
    return headers;
  };

  return new QelosSDK(options);
}
