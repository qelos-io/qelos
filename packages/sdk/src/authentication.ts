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
