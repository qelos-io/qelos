import { FetchLike, QelosSDKOptions } from './types';

const ERRORS = {
  EXTRA_HEADERS: 'could not get extra headers',
  FAILED_REFRESH_TOKEN: 'could not handle failed refresh token',
  UNABLE_TO_REFRESH_TOKEN: 'could not able to refresh token'
}

export default class BaseSDK {
  #appUrl: string;
  #fetch: FetchLike;

  constructor(private qlOptions: QelosSDKOptions) {
    this.#appUrl = qlOptions.appUrl?.endsWith('/') ? qlOptions.appUrl.slice(0, -1) : qlOptions.appUrl;
    this.#fetch = qlOptions.fetch || globalThis.fetch;
  }

  async callApi(relativeUrl: string, data?: RequestInit) {
    data = data || {};
    data.headers = data.headers || {};
    
    if (this.qlOptions.extraHeaders) {
      try {
        const extraHeaders = await this.qlOptions.extraHeaders(relativeUrl);
        Object.assign(data.headers, extraHeaders);
      } catch (e) {
        throw new Error(ERRORS.EXTRA_HEADERS);
      }
    }
    
    return this.#fetch(this.#appUrl + relativeUrl, data);
  }

  private async handleFailedRefreshToken(): Promise<void> {
    if (this.qlOptions.onFailedRefreshToken) {
      try {
        await this.qlOptions.onFailedRefreshToken();
      } catch (e) {
        throw new Error(ERRORS.FAILED_REFRESH_TOKEN);
      }
    } else {
      throw new Error(ERRORS.UNABLE_TO_REFRESH_TOKEN);
    }
  }

  private getContentType(res: Response): string {
    return res.headers.get('Content-Type') ||
      res.headers.get('content-type') ||
      res.headers.get('ContentType') ||
      res.headers.get('contenttype') ||
      res.headers.get('contentType') || 'text';
  }

  private async parseResponse<T>(res: Response): Promise<T> {
    const contentType = this.getContentType(res);
    const isJson = contentType.includes('json');

    const body = await (isJson ? res.json() : res.text());

    if (!res.ok) {
      if (typeof body === 'string') {
        throw new Error(body);
      }

      const message = body?.message || body?.error?.message || body?.error_description || body?.error || 'Request failed';
      const error = new Error(message);
      (error as Error & { details?: unknown }).details = body;
      throw error;
    }

    return body;
  }

  async callJsonApi<T>(relativeUrl: string, data?: RequestInit): Promise<T> {
    try {
      let res = await this.callApi(relativeUrl, data);
      
      // Handle token refresh if needed
      if (this.qlOptions.forceRefresh && res.status >= 400 && res.status < 500) {
        let headers: Record<string, string> = {};
        
        if (this.qlOptions.extraHeaders) {
          try {
            headers = await this.qlOptions.extraHeaders(relativeUrl, true);
          } catch {
            // Ignore error during refresh attempt
          }
        }
        
        if (!headers?.authorization) {
          await this.handleFailedRefreshToken();
        }
        
        res = await this.callApi(relativeUrl, data);
      }
      
      return this.parseResponse<T>(res);
    } catch (err: unknown) {
      // Type guard for Error objects
      if (err instanceof Error && err.message === ERRORS.EXTRA_HEADERS) {
        // Handle token refresh for EXTRA_HEADERS_ERROR
        await this.handleFailedRefreshToken();
        
        const res = await this.callApi(relativeUrl, data);
        return this.parseResponse<T>(res);
      }
      
      throw err;
    }
  }

  getQueryParams(moreQuery?: Record<string, any>) {
    const qs = this.qlOptions.extraQueryParams ? { ...this.qlOptions.extraQueryParams(), ...(moreQuery || {}) } : moreQuery;
    return qs ? `?${new URLSearchParams(qs)}` : '';
  }
}
