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
  /** Workspace scope when set; may be an id string or a populated `{ _id, name }` from list responses */
  workspace?: string | { _id: string; name?: string } | null;
  /** Successful API-token authentications (server-maintained). */
  usageCount?: number;
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
      method: 'post'
    });
    if (!res.ok) {
      throw new Error('failed to exchange refresh token');
    }
    const body = (await res.json()) as { payload: BasicPayload & { workspace?: any } };
    return {
      ...body,
      headers: {
        'set-cookie': res.headers?.get('set-cookie')
      }
    };
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
