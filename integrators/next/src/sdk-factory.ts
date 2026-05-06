import QelosSDK from '@qelos/sdk';
import type { QelosSDKOptions } from '@qelos/sdk/types';
import type {
  QelosNextConfig,
  QelosTokenPair,
  TokenRefreshHook,
} from './types';

const NO_AUTH_URLS = new Set([
  '/api/token/refresh',
  '/api/signin',
  '/api/signup',
]);

export interface CreateSdkParams<TRefreshTarget = unknown> {
  config: QelosNextConfig;
  /**
   * Tokens for the current request. The factory mutates this object in place
   * when a token refresh occurs, so callers can read the latest pair after
   * the SDK has been used.
   */
  tokens: QelosTokenPair;
  /**
   * Transport-specific carrier passed through to `onTokenRefresh`. Edge
   * middleware passes the outbound `NextResponse`; Pages Router passes the
   * `NextApiResponse` / `ServerResponse`; App Router server components pass
   * `null` because they cannot mutate cookies after rendering starts.
   */
  refreshTarget: TRefreshTarget;
  onTokenRefresh?: TokenRefreshHook<TRefreshTarget>;
}

export function createRequestSdk<TRefreshTarget = unknown>({
  config,
  tokens,
  refreshTarget,
  onTokenRefresh,
}: CreateSdkParams<TRefreshTarget>): QelosSDK {
  let sdk: QelosSDK;
  let refreshInFlight: Promise<void> | null = null;
  const baseOptions = config.sdkOptions || {};

  async function performRefresh(): Promise<void> {
    if (!tokens.refreshToken) {
      throw new Error('no refresh token available');
    }
    const previous: QelosTokenPair = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    const result = await sdk.authentication.refreshToken(tokens.refreshToken);
    const refreshed = {
      accessToken: result.payload.token,
      refreshToken: result.payload.refreshToken,
    };
    tokens.accessToken = refreshed.accessToken;
    tokens.refreshToken = refreshed.refreshToken;
    if (onTokenRefresh) {
      await onTokenRefresh({
        target: refreshTarget,
        oldTokens: previous,
        newTokens: refreshed,
        sdk,
      });
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
    fetch: globalThis.fetch.bind(globalThis),
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
    options.extraHeaders = async (relativeUrl, forceRefresh) => {
      const headers: Record<string, string> = {};
      if (NO_AUTH_URLS.has(relativeUrl)) {
        return headers;
      }
      if (forceRefresh && tokens.refreshToken) {
        await ensureRefresh();
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
