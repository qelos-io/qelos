import {FetchLike, QelosSDKOptions} from './types';

export default class BaseSDK {
  #appUrl: string;
  #fetch: FetchLike;

  constructor(private qlOptions: QelosSDKOptions) {
    this.#appUrl = qlOptions.appUrl.endsWith('/') ? qlOptions.appUrl.slice(0, -1) : qlOptions.appUrl;
    this.#fetch = qlOptions.fetch;
  }

  callApi(relativeUrl: string, data?: RequestInit) {
    data = data || {};
    data.headers = data.headers || {};
    Object.assign(data.headers, this.qlOptions.extraHeaders());
    return this.#fetch(this.#appUrl + relativeUrl, data);
  }

  callJsonApi<T>(relativeUrl: string, data?: RequestInit): Promise<T> {
    return this.callApi(relativeUrl, data).then(async res => {
      let body;
      try {
        body = await res.json()
        if (res.status < 300) {
          return body;
        }
      } catch {
        throw new Error(await res.text())
      }
      throw body;
    });
  }
}
