'use strict';

const sdkModule = require('@qelos/sdk');
const QelosSDK = sdkModule.default || sdkModule;

const NO_AUTH_URLS = new Set([
  '/api/token/refresh',
  '/api/cookie/refresh',
  '/api/signin',
  '/api/signup',
]);

const DEFAULT_ACCESS_COOKIE = 'q_access_token';
const DEFAULT_REFRESH_COOKIE = 'q_refresh_token';

function serializeCookie(name, value, secure) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Serializes refreshed tokens as Set-Cookie header value strings (same rules as
 * @qelos/integrator-express writeTokensToCookies).
 */
function tokensToSetCookieHeaderValues(config, resolved) {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const secure = !/^http:\/\//i.test(config.appUrl);
  const out = [
    serializeCookie(accessCookie, resolved.accessToken, secure),
  ];
  if (resolved.refreshToken) {
    out.push(serializeCookie(refreshCookie, resolved.refreshToken, secure));
  }
  return out;
}

/** @param {Record<string, unknown>} params */
function createRequestSdk(params) {
  const {
    config,
    tokens,
    event,
    responseCookies,
    onTokenRefresh,
    staticRequestHeaders,
  } = params;
  let sdk;
  let refreshInFlight = null;
  const baseOptions = config.sdkOptions || {};
  const forwarded = staticRequestHeaders || {};

  async function performRefresh() {
    if (!tokens.refreshToken && !tokens.accessToken) {
      throw new Error('no refresh token available');
    }
    const previous = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    let refreshed;
    if (tokens.refreshToken) {
      const result = await sdk.authentication.refreshToken(tokens.refreshToken);
      refreshed = {
        accessToken: result.payload.token,
        refreshToken: result.payload.refreshToken,
      };
    } else {
      const result = await sdk.authentication.refreshCookieToken(
        tokens.accessToken,
      );
      refreshed = {
        accessToken: result.payload.cookieToken,
      };
    }
    tokens.accessToken = refreshed.accessToken;
    tokens.refreshToken = refreshed.refreshToken;
    const hook = onTokenRefresh || defaultNetlifyTokenRefresh;
    await hook({
      event,
      responseCookies,
      oldTokens: previous,
      newTokens: refreshed,
      sdk,
    });
  }

  async function defaultNetlifyTokenRefresh(ctx) {
    const values = tokensToSetCookieHeaderValues(config, ctx.newTokens);
    for (const v of values) {
      ctx.responseCookies.push(v);
    }
  }

  function ensureRefresh() {
    if (!refreshInFlight) {
      refreshInFlight = performRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  const options = {
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
      const headers = { ...forwarded };
      if (NO_AUTH_URLS.has(relativeUrl)) {
        return headers;
      }
      if (forceRefresh && tokens.refreshToken) {
        await ensureRefresh();
      }
      const token =
        sdk?.authentication?.accessToken || tokens.accessToken;
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

module.exports = {
  createRequestSdk,
  tokensToSetCookieHeaderValues,
};
