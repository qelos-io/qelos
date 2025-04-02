import { FetchLike, QelosSDKOptions } from './types';

export default class BaseSDK {
  #appUrl: string;
  #fetch: FetchLike;

  constructor(private qlOptions: QelosSDKOptions) {
    this.#appUrl = qlOptions.appUrl.endsWith('/') ? qlOptions.appUrl.slice(0, -1) : qlOptions.appUrl;
    this.#fetch = qlOptions.fetch || globalThis.fetch;
  }

  async callApi(relativeUrl: string, data?: RequestInit) {
    data = data || {};
    data.headers = data.headers || {};
    Object.assign(data.headers, await this.qlOptions.extraHeaders(relativeUrl));
    return this.#fetch(this.#appUrl + relativeUrl, data);
  }

  callJsonApi<T>(relativeUrl: string, data?: RequestInit): Promise<T> {
    return this.callApi(relativeUrl, data).then(async res => {
      if (this.qlOptions.forceRefresh && res.status >= 400 && res.status < 500) {
        const headers = await this.qlOptions.extraHeaders(relativeUrl, true);
        if (!headers.authorization) {
          if (this.qlOptions.onFailedRefreshToken) {
            try {
              await this.qlOptions.onFailedRefreshToken();
            } catch (e) {
              throw new Error('could not able to refresh token');
            }
          }
          throw new Error('could not able to refresh token');
        }
        res = await this.callApi(relativeUrl, data);
      }
      const isJson = (res.headers.get('Content-Type') ||
        res.headers.get('content-type') ||
        res.headers.get('ContentType') ||
        res.headers.get('contenttype') ||
        res.headers.get('contentType') || 'text').includes('json');
      const body = await (isJson ? res.json() : res.text());
      if (!res.ok) {
        throw (typeof body === 'string' ? new Error(body) : body);
      }
      return body
    });
  }

  getQueryParams(moreQuery?: Record<string, any>) {
    const qs = this.qlOptions.extraQueryParams ? { ...this.qlOptions.extraQueryParams(), ...(moreQuery || {}) } : moreQuery;
    return qs ? `?${new URLSearchParams(qs)}` : '';
  }
}
