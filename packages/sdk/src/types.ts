export type FetchLike = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export interface QelosSDKOptions {
  appUrl: string;
  fetch: FetchLike;
  accessToken?: string;
  refreshToken?: string;
  apiToken?: string;
  /** Workspace id sent as the `x-workspace` header. Applies only with `apiToken` that is not bound to a workspace. */
  workspace?: string;
  getAccessToken?: () => undefined | string;
  extraHeaders?: (relativeUrl: string, forceRefresh?: boolean) => Promise<{ [key: string]: string }>;
  forceRefresh?: boolean;
  onFailedRefreshToken?: () => Promise<void>;
  extraQueryParams?: () => Record<string, string>
}

export type RequestExtra = Partial<RequestInit & { query?: Record<string, string> }>