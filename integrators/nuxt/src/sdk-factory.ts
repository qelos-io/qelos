import QelosSDK from '@qelos/sdk';
import type { QelosSDKOptions, FetchLike } from '@qelos/sdk/types';
import { getRequestHeader, type H3Event } from 'h3';
import type {
  QelosNuxtRuntimeConfig,
  QelosTokenPair,
  ResolvedTokens,
  TokenRefreshHook,
} from './types';

export interface CreateSdkParams {
  config: QelosNuxtRuntimeConfig;
  /**
   * Tokens for the current request. The factory mutates this object in
   * place when a token refresh occurs, so callers can read the latest pair
   * after the SDK has been used.
   */
  tokens: QelosTokenPair;
  event: H3Event;
  onTokenRefresh?: TokenRefreshHook;
}

const NO_AUTH_URLS = new Set([
  '/api/token/refresh',
  '/api/cookie/refresh',
  '/api/signin',
  '/api/signup',
]);

export function createRequestSdk({ config, tokens, event, onTokenRefresh }: CreateSdkParams): QelosSDK {
  let sdk: QelosSDK;
  let refreshInFlight: Promise<void> | null = null;

  const baseOptions: Partial<QelosSDKOptions> = config.sdkOptions || {};

  async function performRefresh(): Promise<void> {
    if (!tokens.refreshToken && !tokens.accessToken) {
      throw new Error('no refresh token available');
    }
    const previous: QelosTokenPair = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    let refreshed: ResolvedTokens;
    if (tokens.refreshToken) {
      const result = await sdk.authentication.refreshToken(tokens.refreshToken);
      refreshed = {
        accessToken: result.payload.token,
        refreshToken: result.payload.refreshToken,
      };
    } else {
      const result = await sdk.authentication.refreshCookieToken(tokens.accessToken);
      refreshed = {
        accessToken: result.payload.cookieToken,
      };
    }
    tokens.accessToken = refreshed.accessToken;
    tokens.refreshToken = refreshed.refreshToken;
    if (onTokenRefresh) {
      await onTokenRefresh({ event, oldTokens: previous, newTokens: refreshed, sdk });
    }
  }

  function ensureRefresh(): Promise<void> {
    if (!refreshInFlight) {
      refreshInFlight = performRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  const options: QelosSDKOptions = {
    appUrl: config.appUrl,
    fetch: (globalThis.fetch as unknown as FetchLike),
    forceRefresh: !config.apiToken,
    ...baseOptions,
  };

  if (config.apiToken) {
    options.apiToken = config.apiToken;
  } else {
    if (tokens.accessToken) {
      options.accessToken = tokens.accessToken;
    }
    if (tokens.refreshToken) {
      options.refreshToken = tokens.refreshToken;
    }

    options.extraHeaders = async (relativeUrl: string, forceRefresh?: boolean) => {
      if (NO_AUTH_URLS.has(relativeUrl)) {
        return {};
      }
      if (forceRefresh && tokens.refreshToken) {
        await ensureRefresh();
      }
      const headers: Record<string, string> = {};
      const cookie = getRequestHeader(event, 'cookie');
      if (cookie) {
        headers.cookie = cookie;
      }
      const token = sdk?.authentication?.accessToken || tokens.accessToken;
      if (token) {
        headers.authorization = 'Bearer ' + token;
      }
      return headers;
    };

    options.onFailedRefreshToken = async () => {
      await ensureRefresh();
    };
  }

  sdk = new QelosSDK(options);
  return sdk;
}
