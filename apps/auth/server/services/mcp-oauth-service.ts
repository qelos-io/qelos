import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { refreshTokenSecret, tokenExpiration } from '../../config';
import { setToken } from './users';

const MCP_STATE_EXPIRY = '10m';
const AUTH_CODE_TTL_SECONDS = 600;

const KNOWN_CLIENT_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: 'cursor', pattern: /^cursor:\/\//i },
  { id: 'claude', pattern: /^https:\/\/(claude\.ai|claude\.com|.*\.anthropic\.com)/i },
  { id: 'codex', pattern: /^https:\/\/(chatgpt\.com|.*\.openai\.com)/i },
  { id: 'devin', pattern: /^https:\/\/(.*\.)?devin\.ai/i },
  { id: 'mintmcp', pattern: /^https:\/\/(.*\.)?mintmcp\.com/i },
  { id: 'opencode', pattern: /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/mcp\/oauth\/callback/i },
  { id: 'claude-code', pattern: /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/callback(?:[/?#]|$)/i },
  { id: 'gemini-cli', pattern: /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/oauth\/callback/i },
  { id: 'https', pattern: /^https:\/\//i },
  { id: 'http-loopback', pattern: /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//i },
  { id: 'custom-scheme', pattern: /^[a-z][a-z0-9+.-]*:\/\//i },
];

export interface McpOAuthStatePayload {
  ru: string;
  s?: string;
  cc?: string;
  ccm?: string;
  t: string;
  cid?: string;
}

export interface McpAuthorizeParams {
  redirectUri: string;
  state?: string | null;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
  clientId?: string | null;
  tenant: string;
}

export interface StoredMcpAuthCode {
  userId: string;
  tenant: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  workspace?: { _id: string; name?: string; roles?: string[]; labels?: string[] };
}

export interface McpOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function trimUrl(url: string): string {
  return url.trim();
}

function detectKnownClient(url: string): { id: string; pattern: RegExp } | null {
  const trimmed = trimUrl(url);
  return KNOWN_CLIENT_PATTERNS.find((client) => client.pattern.test(trimmed)) || null;
}

function getUrlOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
    if (parsed.host) {
      return `${parsed.protocol}//${parsed.host}`;
    }
    const match = url.match(/^([a-z][a-z0-9+.-]*:\/\/[^/?#]+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function matchesKnownClientFamily(redirectUri: string, permitted: string): boolean {
  const redirectClient = detectKnownClient(redirectUri);
  const permittedClient = detectKnownClient(permitted);
  if (!redirectClient || !permittedClient || redirectClient.id !== permittedClient.id) {
    return false;
  }

  const redirectOrigin = getUrlOrigin(redirectUri);
  const permittedOrigin = getUrlOrigin(permitted);
  if (redirectOrigin && permittedOrigin && redirectOrigin === permittedOrigin) {
    return true;
  }

  const permittedBase = permitted.replace(/\/$/, '');
  return redirectUri === permitted
    || redirectUri.startsWith(`${permittedBase}/`)
    || redirectUri.startsWith(permittedBase);
}

function matchesPermittedEntry(redirectUri: string, permitted: string): boolean {
  const normalizedRedirect = trimUrl(redirectUri);
  const normalizedPermitted = trimUrl(permitted);

  if (!normalizedPermitted) {
    return false;
  }

  // Support wildcard patterns for loopback URLs (e.g., http://127.0.0.1:*/auth/callback)
  if (normalizedPermitted.includes(':*')) {
    const wildcardPattern = normalizedPermitted.replace(':*', ':\\d+');
    const regex = new RegExp(`^${wildcardPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    return regex.test(normalizedRedirect);
  }

  if (normalizedPermitted.endsWith('*')) {
    return normalizedRedirect.startsWith(normalizedPermitted.slice(0, -1));
  }

  if (normalizedRedirect === normalizedPermitted) {
    return true;
  }

  return matchesKnownClientFamily(normalizedRedirect, normalizedPermitted);
}

export function isRedirectUriPermitted(redirectUri: string, permittedCallbackUrls: string[] = []): boolean {
  if (!redirectUri || !permittedCallbackUrls.length) {
    return false;
  }

  return permittedCallbackUrls.some((permitted) => matchesPermittedEntry(redirectUri, permitted));
}

export function buildMcpOAuthState(params: McpAuthorizeParams): string {
  const payload: McpOAuthStatePayload = {
    ru: params.redirectUri,
    t: params.tenant,
  };

  if (params.state) payload.s = params.state;
  if (params.codeChallenge) payload.cc = params.codeChallenge;
  if (params.codeChallengeMethod) payload.ccm = params.codeChallengeMethod;
  if (params.clientId) payload.cid = params.clientId;

  return jwt.sign(payload, refreshTokenSecret, { expiresIn: MCP_STATE_EXPIRY });
}

export function unpackMcpOAuthState(rawState: string): McpOAuthStatePayload | null {
  if (!rawState) {
    return null;
  }

  try {
    const decoded = jwt.verify(rawState, refreshTokenSecret) as McpOAuthStatePayload & {
      iat?: number;
      exp?: number;
    };

    if (!decoded.ru || !decoded.t) {
      return null;
    }

    const payload: McpOAuthStatePayload = {
      ru: decoded.ru,
      t: decoded.t,
    };

    if (decoded.s) payload.s = decoded.s;
    if (decoded.cc) payload.cc = decoded.cc;
    if (decoded.ccm) payload.ccm = decoded.ccm;
    if (decoded.cid) payload.cid = decoded.cid;

    return payload;
  } catch {
    return null;
  }
}

export function usesPkce(state: Pick<McpOAuthStatePayload, 'cc' | 'ccm'>): boolean {
  return Boolean(state.cc && state.ccm);
}

export function buildAuthorizePath(params: McpAuthorizeParams): string {
  const search = new URLSearchParams({ redirect_uri: params.redirectUri });
  if (params.state) search.set('state', params.state);
  if (params.codeChallenge) search.set('code_challenge', params.codeChallenge);
  if (params.codeChallengeMethod) search.set('code_challenge_method', params.codeChallengeMethod);
  if (params.clientId) search.set('client_id', params.clientId);
  return `/api/auth/mcp/authorize?${search.toString()}`;
}

export function buildLoginRedirectUrl(authorizePath: string): string {
  return `/login?redirect=${encodeURIComponent(authorizePath)}`;
}

export function buildConsentPageUrl(packedState: string): string {
  return `/mcp/authorize?mcp_state=${encodeURIComponent(packedState)}`;
}

export function buildOAuthDiscoveryDocument(baseUrl: string) {
  const issuer = baseUrl.replace(/\/$/, '');
  return {
    issuer,
    authorization_endpoint: `${issuer}/api/auth/mcp/authorize`,
    token_endpoint: `${issuer}/api/auth/mcp/token`,
    registration_endpoint: `${issuer}/.well-known/oauth-authorization-server/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['none'],
  };
}

export function buildTenantBaseUrl(tenantHost: string, useHttps = true): string {
  if (tenantHost.startsWith('http://') || tenantHost.startsWith('https://')) {
    return tenantHost.replace(/\/$/, '');
  }
  const isLoopback = /^localhost|127\.0\.0\.1|\[::1\]/i.test(tenantHost.split(':')[0]);
  const protocol = useHttps && !isLoopback ? 'https' : 'http';
  return `${protocol}://${tenantHost}`.replace(/\/$/, '');
}

export function parseAuthorizeQuery(query: Record<string, unknown>): {
  redirectUri: string | null;
  state: string | null;
  codeChallenge: string | null;
  codeChallengeMethod: string | null;
  clientId: string | null;
} {
  const read = (key: string): string | null => {
    const value = query[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
      return value[0];
    }
    return null;
  };

  return {
    redirectUri: read('redirect_uri'),
    state: read('state'),
    codeChallenge: read('code_challenge'),
    codeChallengeMethod: read('code_challenge_method'),
    clientId: read('client_id'),
  };
}

export function validatePkceMethod(method: string | null | undefined): method is 'S256' | 'plain' {
  return method === 'S256' || method === 'plain';
}

export function verifyPkceChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: string,
): boolean {
  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }

  if (method === 'S256') {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return hash === codeChallenge;
  }

  return false;
}

export function createAuthorizationCode(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function getAuthCodeCacheKey(code: string): string {
  return `mcp:auth-code:${code}`;
}

export function getAuthCodeTtlSeconds(): number {
  return AUTH_CODE_TTL_SECONDS;
}

export async function issueMcpOAuthTokens(user: any, workspace?: any): Promise<McpOAuthTokens> {
  const { token, refreshToken } = await setToken({ user, workspace }, 'oauth');
  return {
    accessToken: token,
    refreshToken,
    expiresIn: getAccessTokenExpiresIn(token),
  };
}

export function getAccessTokenExpiresIn(accessToken: string): number {
  const decoded = jwt.decode(accessToken) as { exp?: number } | null;
  if (decoded?.exp) {
    return Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0);
  }

  return parseTokenExpirationSeconds(tokenExpiration);
}

function parseTokenExpirationSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    return 18000;
  }

  const amount = Number(match[1]);
  switch (match[2]) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default:
      return 18000;
  }
}

export function appendAuthorizationCodeRedirect(
  redirectUri: string,
  code: string,
  state?: string | null,
): string {
  const url = new URL(redirectUri);
  url.searchParams.set('code', code);
  if (state) {
    url.searchParams.set('state', state);
  }
  return url.toString();
}

export function appendTokenRedirect(
  redirectUri: string,
  tokens: McpOAuthTokens,
  state?: string | null,
  delivery: 'query' | 'fragment' = 'query',
): string {
  const params = new URLSearchParams({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: 'Bearer',
    expires_in: String(tokens.expiresIn),
  });

  if (state) {
    params.set('state', state);
  }

  if (delivery === 'fragment') {
    const base = redirectUri.split('#')[0];
    return `${base}#${params.toString()}`;
  }

  const separator = redirectUri.includes('?') ? '&' : '?';
  return `${redirectUri}${separator}${params.toString()}`;
}

export function appendAccessDeniedRedirect(redirectUri: string, state?: string | null): string {
  try {
    const url = new URL(redirectUri);
    url.searchParams.set('error', 'access_denied');
    if (state) {
      url.searchParams.set('state', state);
    }
    return url.toString();
  } catch {
    const separator = redirectUri.includes('?') ? '&' : '?';
    let result = `${redirectUri}${separator}error=access_denied`;
    if (state) {
      result += `&state=${encodeURIComponent(state)}`;
    }
    return result;
  }
}

export function toOAuthTokenResponse(tokens: McpOAuthTokens) {
  return {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: 'Bearer',
    expires_in: tokens.expiresIn,
  };
}
