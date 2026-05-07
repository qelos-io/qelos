import { QelosSDKOptions } from './types';
import BaseSDK from './base-sdk';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  fullName: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  roles: string[];
  metadata: any;

  [key: string]: any;
}

export interface ICredentials {
  username: string;
  password: string;
  roles?: string[];
}

export interface BasicPayload {
  user: IUser;
}

export interface ISignupInformation {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  fullName?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
}

export interface IApiToken {
  _id: string;
  nickname: string;
  tokenPrefix: string;
  expiresAt: string;
  lastUsedAt?: string;
  workspace?: string;
  created: string;
}

export type SocialProvider = 'linkedin' | 'facebook' | 'google' | 'github';

export interface SocialLoginOptions {
  state?: string;
  returnUrl?: string;
}

export interface SocialAuthCallbackPayload {
  payload: BasicPayload & { workspace?: any };
  headers: { 'set-cookie': string | null };
  /**
   * Present when the runtime exposes multiple `Set-Cookie` headers (Node fetch
   * `getSetCookie()`). Use {@link getSocialAuthSetCookieParts} to apply cookies.
   */
  setCookieHeaders?: string[];
}

/** Callback URL or query bag carrying `rt` from `GET …/callback?rt=…`. */
export type SocialCallbackInput =
  | string
  | URL
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function collectSetCookieHeaders(res: Response): string[] | undefined {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === 'function') {
    const list = h.getSetCookie();
    return list.length ? list : undefined;
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : undefined;
}

/**
 * Read the OAuth refresh token from a social callback request (query `rt`).
 * Accepts a full URL, a {@link URL}, `URLSearchParams`, or a query object such
 * as `req.query` from Next.js or Express.
 */
export function parseSocialCallbackRefreshToken(input: SocialCallbackInput): string | undefined {
  if (input instanceof URL) {
    return input.searchParams.get('rt') ?? undefined;
  }
  if (typeof input === 'string') {
    try {
      const u = new URL(input, 'http://qelos.social-callback.invalid');
      return u.searchParams.get('rt') ?? undefined;
    } catch {
      return undefined;
    }
  }
  if (input instanceof URLSearchParams) {
    return input.get('rt') ?? undefined;
  }
  const raw = input['rt'];
  if (Array.isArray(raw)) {
    return raw[0] && typeof raw[0] === 'string' ? raw[0] : undefined;
  }
  return typeof raw === 'string' ? raw : undefined;
}

/** Lists individual `Set-Cookie` values from an exchange result for writing to a response. */
export function getSocialAuthSetCookieParts(result: SocialAuthCallbackPayload): string[] {
  if (result.setCookieHeaders?.length) {
    return result.setCookieHeaders;
  }
  const h = result.headers['set-cookie'];
  return h ? [h] : [];
}

/**
 * Copies session cookies from {@link QlAuthentication.exchangeAuthCallback} /
 * {@link QlAuthentication.socialCallback} onto an HTTP response (Express,
 * Next.js Pages `NextApiResponse`, Node `ServerResponse`, etc.).
 */
export function applySocialAuthCookiesToServerResponse(
  res: { setHeader(name: string, value: string | string[]): void },
  result: SocialAuthCallbackPayload,
): void {
  const parts = getSocialAuthSetCookieParts(result);
  if (!parts.length) return;
  res.setHeader('Set-Cookie', parts.length === 1 ? parts[0]! : parts);
}

export default class QlAuthentication extends BaseSDK {

  #refreshToken: string;
  #accessToken: string;
  #apiToken: string;

  get accessToken() {
    return this.#accessToken;
  }

  get isApiTokenAuth(): boolean {
    return !!this.#apiToken;
  }

  constructor(options: QelosSDKOptions) {
    super(options);
    if (options.accessToken || options.getAccessToken) {
      this.#accessToken = options.accessToken || options.getAccessToken();
      delete options.accessToken;
    }
    if (options.refreshToken) {
      this.#refreshToken = options.refreshToken;
      delete options.refreshToken;
    }
    if (options.apiToken) {
      this.#apiToken = options.apiToken;
    }
  }

  async signin(credentials: ICredentials) {
    const res = await this.callApi('/api/signin', {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
      throw new Error('failed to login')
    }
    const body = (await res.json()) as { payload: BasicPayload }

    return {
      ...body,
      headers: {
        'set-cookie': res.headers?.get('set-cookie')
      }
    }
  }

  oAuthSignin(credentials: ICredentials) {
    return this.callJsonApi<{ payload: BasicPayload & { token: string, refreshToken: string } }>(
      '/api/signin',
      {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...credentials, authType: 'oauth' })
      })
      .then(data => {
        this.#accessToken = data.payload.token;
        this.#refreshToken = data.payload.refreshToken;
        return data;
      })
  }

  signup(information: ISignupInformation) {
    return this.callJsonApi<{ payload: BasicPayload }>(
      '/api/signup',
      {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(information)
      })
  }

  oAuthSignup(information: ISignupInformation) {
    return this.callJsonApi<{ payload: BasicPayload & { token: string, refreshToken: string } }>(
      '/api/signup',
      {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...information, authType: 'oauth' })
      })
      .then(data => {
        this.#accessToken = data.payload.token;
        this.#refreshToken = data.payload.refreshToken;
        return data;
      })
  }

  refreshToken(refreshToken?: string) {
    refreshToken = refreshToken || this.#refreshToken;
    if (!refreshToken) {
      throw new Error('existing refresh token not found');
    }
    return this.callJsonApi<{ payload: BasicPayload & { token: string, refreshToken: string } }>(
      '/api/token/refresh',
      {
        method: 'post',
        headers: {
          authorization: 'Bearer ' + refreshToken
        }
      })
      .then(data => {
        this.#accessToken = data.payload.token;
        this.#refreshToken = data.payload.refreshToken;
        return data;
      })
  }

  async refreshCookieToken(cookieToken?: string) {
    const headers: Record<string, string> = {};
    if (cookieToken) {
      headers.authorization = 'Bearer ' + cookieToken;
    }
    const res = await this.callApi('/api/cookie/refresh', {
      method: 'post',
      headers,
    });
    if (!res.ok) {
      throw new Error('failed to refresh cookie token');
    }
    const body = (await res.json()) as {
      payload: BasicPayload & {
        cookieToken: string;
        workspace?: { _id: string } | null;
      };
    };
    return {
      ...body,
      headers: {
        'set-cookie': res.headers?.get('set-cookie'),
      },
    };
  }

  async apiTokenSignin(apiToken: string): Promise<IUser> {
    this.#apiToken = apiToken;
    this.qlOptions.apiToken = apiToken;
    return this.callJsonApi<IUser>('/api/me');
  }

  listApiTokens(): Promise<IApiToken[]> {
    return this.callJsonApi<IApiToken[]>('/api/me/api-tokens');
  }

  createApiToken(data: { nickname: string; workspace?: string; expiresAt: string }): Promise<{ token: string; apiToken: IApiToken }> {
    return this.callJsonApi<{ token: string; apiToken: IApiToken }>('/api/me/api-tokens', {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  deleteApiToken(tokenId: string): Promise<void> {
    return this.callJsonApi<void>(`/api/me/api-tokens/${tokenId}`, {
      method: 'delete',
    });
  }

  logout() {
    return this.callApi('/api/logout', { method: 'post' })
  }

  getSocialLoginUrl(provider: SocialProvider, options: SocialLoginOptions = {}): string {
    const params: Record<string, string> = {};
    if (options.state) params.state = options.state;
    if (options.returnUrl) params.returnUrl = options.returnUrl;
    const qs = Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
    return this.buildUrl(`/api/auth/${provider}${qs}`);
  }

  getSocialCallbackUrl(provider: SocialProvider): string {
    return this.buildUrl(`/api/auth/${provider}/callback`);
  }

  startSocialLogin(provider: SocialProvider, options?: SocialLoginOptions): void {
    const location = (globalThis as any).location;
    if (!location) {
      throw new Error('startSocialLogin requires a browser environment');
    }
    location.href = this.getSocialLoginUrl(provider, options);
  }

  async exchangeAuthCallback(refreshToken: string): Promise<SocialAuthCallbackPayload> {
    if (!refreshToken) {
      throw new Error('refresh token is required');
    }
    const res = await this.callApi(`/api/auth/callback?rt=${encodeURIComponent(refreshToken)}`, {
      method: 'post',
      cache: 'no-store',
    });
    if (!res.ok) {
      let detail = '';
      try {
        detail = (await res.text()).slice(0, 512);
      } catch {
        /* ignore */
      }
      throw new Error(
        `failed to exchange refresh token: HTTP ${res.status}${detail ? ` — ${detail}` : ''}`,
      );
    }
    const body = (await res.json()) as { payload: BasicPayload & { workspace?: any } };
    const cookieParts = collectSetCookieHeaders(res);
    const legacyCookie =
      cookieParts?.[0] ?? res.headers?.get('set-cookie');
    return {
      ...body,
      headers: {
        'set-cookie': legacyCookie ?? null,
      },
      ...(cookieParts && cookieParts.length > 1
        ? { setCookieHeaders: cookieParts }
        : {}),
    };
  }

  /**
   * Full social callback: read `rt` from the request URL or query and exchange
   * it for a session. Use with integrator routes that receive the provider
   * callback with `?rt=` (refresh token) after OAuth.
   */
  async socialCallback(input: SocialCallbackInput): Promise<SocialAuthCallbackPayload> {
    const refreshToken = parseSocialCallbackRefreshToken(input);
    if (!refreshToken) {
      throw new Error('missing rt query parameter');
    }
    return this.exchangeAuthCallback(refreshToken);
  }

  getLoggedInUser() {
    return this.callJsonApi<IUser>('/api/me')
  }

  updateLoggedInUser(changes: Partial<IUser & { password?: string }>): Promise<IUser> {
    return this.callJsonApi<IUser>('/api/me', {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(changes)
    })
  }
}
