import type QelosSDK from '@qelos/sdk';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import type { QelosSDKOptions } from '@qelos/sdk/types';

export interface QelosTokenPair {
  accessToken?: string;
  refreshToken?: string;
}

export interface ResolvedTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * A request-like object. NestJS can run on either Express or Fastify, so we
 * type the bits we touch generically and feature-detect at runtime.
 */
export interface AnyRequest {
  url?: string;
  path?: string;
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  qelos?: QelosRequestContext;
  [key: string]: unknown;
}

/**
 * A response-like object (Express `Response` or Fastify `FastifyReply`).
 */
export interface AnyResponse {
  cookie?: (
    name: string,
    value: string,
    options?: Record<string, unknown>,
  ) => unknown;
  setCookie?: (
    name: string,
    value: string,
    options?: Record<string, unknown>,
  ) => unknown;
  setHeader?: (name: string, value: string | string[]) => unknown;
  header?: (name: string, value: string | string[]) => unknown;
  getHeader?: (name: string) => string | string[] | number | undefined;
  [key: string]: unknown;
}

export interface QelosNestConfig {
  /**
   * Base URL of the Qelos backend (e.g. https://yourdomain.com).
   */
  appUrl: string;
  /**
   * Static API token used for service-to-service calls. When provided, no
   * cookie/refresh-token handling is performed.
   */
  apiToken?: string;
  /**
   * Cookie name carrying the Qelos access token. Defaults to `q_access_token`.
   */
  accessTokenCookie?: string;
  /**
   * Cookie name carrying the Qelos refresh token. Defaults to `q_refresh_token`.
   */
  refreshTokenCookie?: string;
  /**
   * If true, the middleware short-circuits with 401 when the user cannot be
   * resolved. Defaults to `false` — anonymous requests pass through with
   * `request.qelos.user = null`.
   *
   * For more granular control, prefer `QelosAuthGuard` on the routes that
   * need authentication.
   */
  requireAuth?: boolean;
  /**
   * Skip the middleware entirely for requests whose path starts with any of
   * these prefixes. Useful for `/health`, `/api/_auth`, etc.
   */
  skipPaths?: string[];
  /**
   * Optional extra options merged into the per-request SDK instance.
   */
  sdkOptions?: Partial<QelosSDKOptions>;
}

export type WorkspaceResolver = (params: {
  request: AnyRequest;
  user: IUser;
  workspaces: IWorkspace[];
}) => IWorkspace | null | Promise<IWorkspace | null>;

export interface TokenRefreshContext {
  request: AnyRequest;
  response: AnyResponse;
  oldTokens: QelosTokenPair;
  newTokens: ResolvedTokens;
  sdk: QelosSDK;
}

export type TokenRefreshHook = (
  ctx: TokenRefreshContext,
) => void | Promise<void>;

export interface QelosRequestContext {
  /**
   * The authenticated user, or `null` when anonymous.
   */
  user: IUser | null;
  /**
   * The active workspace for the request, or `null` when none is active /
   * the user is anonymous.
   */
  workspace: IWorkspace | null;
  /**
   * The full list of workspaces the user has access to.
   */
  workspaces: IWorkspace[];
  /**
   * SDK instance bound to the current request's tokens.
   */
  sdk: QelosSDK;
  /**
   * Tokens read from the request. Mutated in place when a refresh occurs so
   * later code can read the current pair.
   */
  tokens: QelosTokenPair;
}

export interface QelosModuleOptions {
  config: QelosNestConfig;
  /**
   * Hook invoked after a successful token refresh. The default implementation
   * writes the new tokens back to the response cookies.
   */
  onTokenRefresh?: TokenRefreshHook;
  /**
   * Resolve the active workspace for a request. Defaults to picking the first
   * workspace returned from `sdk.workspaces.getList()`.
   */
  resolveWorkspace?: WorkspaceResolver;
}
