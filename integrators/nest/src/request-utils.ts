import type {
  AnyRequest,
  AnyResponse,
  QelosNestConfig,
  QelosTokenPair,
  ResolvedTokens,
} from './types';

export const DEFAULT_ACCESS_COOKIE = 'q_access_token';
export const DEFAULT_REFRESH_COOKIE = 'q_refresh_token';

export function readCookie(request: AnyRequest, name: string): string | undefined {
  // Prefer cookie-parser / @fastify/cookie's parsed output when available.
  if (request.cookies && typeof request.cookies[name] === 'string') {
    return request.cookies[name];
  }
  const cookieHeader = request.headers.cookie;
  const header = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
  if (!header) return undefined;
  const prefix = name + '=';
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

export function readTokens(
  request: AnyRequest,
  config: QelosNestConfig,
): QelosTokenPair {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const cookieAccess = readCookie(request, accessCookie);
  const cookieRefresh = readCookie(request, refreshCookie);
  const rawAuth = request.headers.authorization;
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  const headerAccess =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  return {
    accessToken: headerAccess || cookieAccess || undefined,
    refreshToken: cookieRefresh || undefined,
  };
}

function serializeCookie(name: string, value: string, secure: boolean): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function appendSetCookie(response: AnyResponse, value: string): void {
  const setHeader = response.setHeader || response.header;
  const getHeader = response.getHeader;
  const existing =
    typeof getHeader === 'function' ? getHeader.call(response, 'set-cookie') : undefined;
  let next: string[];
  if (Array.isArray(existing)) {
    next = [...existing, value];
  } else if (typeof existing === 'string') {
    next = [existing, value];
  } else {
    next = [value];
  }
  if (typeof setHeader === 'function') {
    setHeader.call(response, 'set-cookie', next);
  }
}

export function writeTokensToCookies(
  response: AnyResponse,
  config: QelosNestConfig,
  tokens: ResolvedTokens,
): void {
  const accessCookie = config.accessTokenCookie || DEFAULT_ACCESS_COOKIE;
  const refreshCookie = config.refreshTokenCookie || DEFAULT_REFRESH_COOKIE;
  const secure = !/^http:\/\//i.test(config.appUrl);

  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
  };

  // Express
  if (typeof response.cookie === 'function') {
    response.cookie(accessCookie, tokens.accessToken, cookieOptions);
    if (tokens.refreshToken) {
      response.cookie(refreshCookie, tokens.refreshToken, cookieOptions);
    }
    return;
  }

  // Fastify (with @fastify/cookie)
  if (typeof response.setCookie === 'function') {
    response.setCookie(accessCookie, tokens.accessToken, cookieOptions);
    if (tokens.refreshToken) {
      response.setCookie(refreshCookie, tokens.refreshToken, cookieOptions);
    }
    return;
  }

  appendSetCookie(response, serializeCookie(accessCookie, tokens.accessToken, secure));
  if (tokens.refreshToken) {
    appendSetCookie(response, serializeCookie(refreshCookie, tokens.refreshToken, secure));
  }
}

export function shouldSkip(
  request: AnyRequest,
  config: QelosNestConfig,
): boolean {
  if (!config.skipPaths?.length) return false;
  const url = request.path || request.url || '';
  const queryIdx = url.indexOf('?');
  const path = queryIdx >= 0 ? url.slice(0, queryIdx) : url;
  return config.skipPaths.some((prefix) => path.startsWith(prefix));
}
