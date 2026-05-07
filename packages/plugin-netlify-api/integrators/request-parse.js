'use strict';

const DEFAULT_API_URL = 'http://159.203.152.168';

const DEFAULT_ACCESS_COOKIE = 'q_access_token';
const DEFAULT_REFRESH_COOKIE = 'q_refresh_token';

function resolveApiHost(override) {
  const raw =
    override ?? process.env.QELOS_API_IP ?? process.env.API_HOST ?? DEFAULT_API_URL;
  const trimmed = String(raw).trim().replace(/\/$/, '');
  if (!trimmed) return DEFAULT_API_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function normalizeIntegratorConfig(options = {}) {
  const appUrl =
    (typeof options.appUrl === 'string' && options.appUrl.trim()) ||
    resolveApiHost(options.apiHost);
  return {
    appUrl,
    apiToken: options.apiToken,
    accessTokenCookie: options.accessTokenCookie,
    refreshTokenCookie: options.refreshTokenCookie,
    requireAuth: options.requireAuth,
    skipPaths: options.skipPaths,
    sdkOptions: options.sdkOptions,
  };
}

function pickHeader(headers, name) {
  if (!headers) return undefined;
  const want = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== want) continue;
    if (v == null) continue;
    const value = Array.isArray(v) ? v[0] : v;
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
}

function readCookie(headers, name) {
  const header = pickHeader(headers, 'cookie');
  if (!header) return undefined;
  const prefix = `${name}=`;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }
  return undefined;
}

function readTokensFromEvent(event, config) {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const cookieAccess = readCookie(event.headers, accessCookie);
  const cookieRefresh = readCookie(event.headers, refreshCookie);
  const authHeader = pickHeader(event.headers, 'authorization');
  const headerAccess =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  return {
    accessToken: headerAccess || cookieAccess || undefined,
    refreshToken: cookieRefresh || undefined,
  };
}

module.exports = {
  resolveApiHost,
  normalizeIntegratorConfig,
  pickHeader,
  readTokensFromEvent,
};
