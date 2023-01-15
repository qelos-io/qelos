export type FetchLike = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export interface QelosSDKOptions {
  appUrl: string;
  fetch: FetchLike;
  accessToken?: string;
  refreshToken?: string;
  getAccessToken?: () => undefined | string;
  extraHeaders?: (relativeUrl: string, forceRefresh?: boolean) => Promise<{ [key: string]: string }>;
  forceRefresh?: boolean;
}
