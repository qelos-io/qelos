import {FetchLike, QelosSDKOptions} from './types';

export default class BaseSDK {
  #appUrl: string;
  #fetch: FetchLike;

  constructor(private qlOptions: QelosSDKOptions) {
    this.#appUrl = qlOptions.appUrl.endsWith('/') ? qlOptions.appUrl.slice(0, -1) : qlOptions.appUrl;
    this.#fetch = qlOptions.fetch;
  }

  async callApi(relativeUrl: string, data?: RequestInit) {
    data = data || {};
    data.headers = data.headers || {};
    Object.assign(data.headers, await this.qlOptions.extraHeaders(relativeUrl));
    return this.#fetch(this.#appUrl + relativeUrl, data);
  }

  callJsonApi<T>(relativeUrl: string, data?: RequestInit): Promise<T> {
    return this.callApi(relativeUrl, data).then(async res => {
      const isJson = (res.headers.get('Content-Type') ||
        res.headers.get('content-type') ||
        res.headers.get('ContentType') ||
        res.headers.get('contenttype') ||
        res.headers.get('contentType') || 'text').includes('json');
      const body = await (isJson ? res.json() : res.text());
      if (!res.ok) {
        throw (typeof body === 'string' ? new Error(body) : body);
      }
      return body;
    });
  }
}
