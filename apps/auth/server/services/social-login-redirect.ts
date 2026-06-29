import jwt from 'jsonwebtoken';
import { AuthRequest } from '../../types';
import { refreshTokenSecret } from '../../config';

/**
 * Normalize a websiteUrls entry to a host (hostname or hostname:port).
 */
export function normalizeWebsiteHost(entry: string): string {
  const trimmed = entry.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('://')) {
      return new URL(trimmed).host;
    }
  } catch {
    // fall through
  }
  return trimmed.split('/')[0];
}

function hostsMatch(requestHost: string, allowedHost: string): boolean {
  if (requestHost === allowedHost) return true;
  if (!allowedHost.includes(':')) {
    return requestHost.split(':')[0] === allowedHost;
  }
  return false;
}

export function isUrlHostInWebsiteUrls(url: string, websiteUrls: string[]): boolean {
  if (!url || url.startsWith('/')) return false;
  try {
    const targetHost = new URL(url).host;
    return websiteUrls.map(normalizeWebsiteHost).filter(Boolean).some((allowedHost) => hostsMatch(targetHost, allowedHost));
  } catch {
    return false;
  }
}

/**
 * Default OAuth callback base: built from the request tenanthost.
 */
export function buildRedirectUri(tenantHost: string, redirectPath: string, useHttps: boolean = true): string {
  const protocol = useHttps ? 'https' : 'http';
  const fullTenantHost = tenantHost.startsWith('http://') || tenantHost.startsWith('https://')
    ? tenantHost
    : `${protocol}://${tenantHost}`;

  return `${fullTenantHost}${redirectPath}`;
}

export function buildOAuthCallbackRedirectUri(
  callbackPath: string,
  websiteUrls: string[],
  redirectUrl?: string | null,
  tenantHost?: string,
  useHttps: boolean = true,
): string | null {
  if (redirectUrl && isUrlHostInWebsiteUrls(redirectUrl, websiteUrls)) {
    return new URL(callbackPath, new URL(redirectUrl).origin).toString();
  }
  if (!tenantHost) return null;
  return buildRedirectUri(tenantHost, callbackPath, useHttps);
}

/**
 * OAuth callback redirect URI registered with the provider.
 * Uses `redirectUrl` query param when its host is in websiteUrls; otherwise tenanthost.
 */
export function getOAuthCallbackRedirectUri(req: AuthRequest, callbackPath: string, useHttps: boolean = true): string | null {
  const redirectUrl = extractRedirectUrl(req) ?? unpackProviderState(req).redirectUrl;
  return buildOAuthCallbackRedirectUri(
    callbackPath,
    req.appConfig.websiteUrls,
    redirectUrl,
    req.headers.tenanthost,
    useHttps,
  );
}

export function extractState(req: AuthRequest): string | null {
  const state = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;
  return state && typeof state === 'string' ? state : null;
}

export function extractRedirectUrl(req: AuthRequest): string | null {
  const value = Array.isArray(req.query.redirectUrl) ? req.query.redirectUrl[0] : req.query.redirectUrl;
  return value && typeof value === 'string' ? value : null;
}

export function extractReturnUrl(req: AuthRequest): string | null {
  const value = Array.isArray(req.query.returnUrl) ? req.query.returnUrl[0] : req.query.returnUrl;
  return value && typeof value === 'string' ? value : null;
}

export function extractAuthCode(req: AuthRequest): string | null {
  const authCode = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
  return authCode && typeof authCode === 'string' ? authCode : null;
}

interface OAuthStatePayload {
  s?: string;
  ru?: string;
  rd?: string;
}

export function buildProviderState(req: AuthRequest): string | null {
  const userState = extractState(req);
  const returnUrl = extractReturnUrl(req);
  const redirectUrl = extractRedirectUrl(req);
  if (!returnUrl && !redirectUrl) {
    return userState;
  }
  const payload: OAuthStatePayload = {};
  if (userState) payload.s = userState;
  if (returnUrl) payload.ru = returnUrl;
  if (redirectUrl) payload.rd = redirectUrl;
  return jwt.sign(payload, refreshTokenSecret, { expiresIn: '10m' });
}

export function unpackProviderState(req: AuthRequest): {
  userState: string | null;
  returnUrl: string | null;
  redirectUrl: string | null;
} {
  const raw = extractState(req);
  if (!raw) {
    return { userState: null, returnUrl: null, redirectUrl: null };
  }
  try {
    const decoded = jwt.verify(raw, refreshTokenSecret) as OAuthStatePayload;
    return {
      userState: decoded.s ?? null,
      returnUrl: decoded.ru ?? null,
      redirectUrl: decoded.rd ?? null,
    };
  } catch {
    return { userState: raw, returnUrl: null, redirectUrl: null };
  }
}

export function isReturnUrlSafe(returnUrl: string, websiteUrls: string[] = []): boolean {
  if (!returnUrl) return false;
  if (returnUrl.startsWith('/') && !returnUrl.startsWith('//')) return true;
  return isUrlHostInWebsiteUrls(returnUrl, websiteUrls);
}

export function appendCallbackParams(returnUrl: string, refreshToken: string, userState?: string | null): string {
  const separator = returnUrl.includes('?') ? '&' : '?';
  let result = `${returnUrl}${separator}rt=${encodeURIComponent(refreshToken)}`;
  if (userState) {
    result += `&state=${encodeURIComponent(userState)}`;
  }
  return result;
}
