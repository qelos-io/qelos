import type { IUser } from './authentication';

export interface McpAuthorizeOptions {
  redirectUri: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  clientId?: string;
}

export interface McpTokenExchangeOptions {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}

export interface McpTokenExchangeResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: IUser;
}

/** Callback URL or query bag from an MCP OAuth redirect. */
export type McpCallbackInput =
  | string
  | URL
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export interface McpCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

function readQueryValue(
  input: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const raw = input[key];
  if (Array.isArray(raw)) {
    return raw[0] && typeof raw[0] === 'string' ? raw[0] : undefined;
  }
  return typeof raw === 'string' ? raw : undefined;
}

function searchParamsFromString(input: string): URLSearchParams | undefined {
  try {
    const url = new URL(input);
    if (url.search) {
      return url.searchParams;
    }
    if (url.hash.length > 1) {
      return new URLSearchParams(url.hash.slice(1));
    }
    return url.searchParams;
  } catch {
    const trimmed = input.trim();
    if (!trimmed) {
      return undefined;
    }
    const queryPart = trimmed.startsWith('?')
      ? trimmed.slice(1)
      : trimmed.startsWith('#')
        ? trimmed.slice(1)
        : trimmed.includes('=')
          ? trimmed
          : undefined;
    return queryPart ? new URLSearchParams(queryPart) : undefined;
  }
}

function searchParamsFromInput(input: McpCallbackInput): URLSearchParams | undefined {
  if (input instanceof URLSearchParams) {
    return input;
  }
  if (input instanceof URL) {
    if (input.search.length > 1) {
      return input.searchParams;
    }
    if (input.hash.length > 1) {
      return new URLSearchParams(input.hash.slice(1));
    }
    return input.searchParams;
  }
  if (typeof input === 'string') {
    return searchParamsFromString(input);
  }

  const params = new URLSearchParams();
  const code = readQueryValue(input, 'code');
  const state = readQueryValue(input, 'state');
  const error = readQueryValue(input, 'error');
  const errorDescription = readQueryValue(input, 'error_description');
  if (code) params.set('code', code);
  if (state) params.set('state', state);
  if (error) params.set('error', error);
  if (errorDescription) params.set('error_description', errorDescription);
  return params.toString() ? params : undefined;
}

/**
 * Parse authorization callback parameters from an MCP OAuth redirect.
 * Accepts a full URL, {@link URL}, `URLSearchParams`, a query/fragment string,
 * or a query object such as `req.query` from Next.js or Express.
 */
export function parseMcpCallbackParams(input: McpCallbackInput): McpCallbackParams {
  const params = searchParamsFromInput(input);
  if (!params) {
    return {};
  }

  const result: McpCallbackParams = {};
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  if (code) result.code = code;
  if (state) result.state = state;
  if (error) result.error = error;
  if (errorDescription) result.errorDescription = errorDescription;
  return result;
}

/** Relative authorize path with query string for {@link QlAuthentication.getMcpAuthorizeUrl}. */
export function buildMcpAuthorizePath(options: McpAuthorizeOptions): string {
  const search = new URLSearchParams({ redirect_uri: options.redirectUri });
  if (options.state) search.set('state', options.state);
  if (options.codeChallenge) search.set('code_challenge', options.codeChallenge);
  if (options.codeChallengeMethod) search.set('code_challenge_method', options.codeChallengeMethod);
  if (options.clientId) search.set('client_id', options.clientId);
  return `/api/auth/mcp/authorize?${search.toString()}`;
}

export interface McpOAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export function buildMcpTokenExchangeBody(options: McpTokenExchangeOptions): URLSearchParams {
  return new URLSearchParams({
    grant_type: 'authorization_code',
    code: options.code,
    redirect_uri: options.redirectUri,
    code_verifier: options.codeVerifier,
  });
}
