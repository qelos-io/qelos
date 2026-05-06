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
  refreshToken: string;
}

export interface QelosNextConfig {
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
   * If true, the request is rejected (401) when the user cannot be resolved.
   * Defaults to `false` — anonymous requests pass through with `qelos.user = null`.
   */
  requireAuth?: boolean;
  /**
   * Skip the integrator entirely for requests whose path starts with any of
   * these prefixes. Useful for `/health`, `/_next`, `/api/_auth`, etc.
   */
  skipPaths?: string[];
  /**
   * Optional extra options merged into the per-request SDK instance.
   */
  sdkOptions?: Partial<QelosSDKOptions>;
}

export interface TokenRefreshContext<TRefreshTarget = unknown> {
  /**
   * The transport-specific carrier for the refresh hook. For App Router edge
   * middleware this is the outbound `NextResponse`; for Pages Router API
   * routes it is the `NextApiResponse`; for `getServerSideProps` it is the
   * raw `ServerResponse`. App Router server components / route handlers do
   * not call this hook because cookies cannot be set after the response has
   * started — the refreshed tokens are only mutated on the in-memory pair.
   */
  target: TRefreshTarget;
  oldTokens: QelosTokenPair;
  newTokens: ResolvedTokens;
  sdk: QelosSDK;
}

export type TokenRefreshHook<TRefreshTarget = unknown> = (
  ctx: TokenRefreshContext<TRefreshTarget>
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

/**
 * Header name used to forward the resolved user id from edge middleware to
 * downstream App Router handlers. Handlers that want the full user object
 * should call `getQelosContext()` from `@qelos/integrator-next/context`.
 */
export const QELOS_USER_HEADER = 'x-qelos-user-id';

/**
 * Header name used to forward the resolved workspace id from edge middleware
 * to downstream App Router handlers.
 */
export const QELOS_WORKSPACE_HEADER = 'x-qelos-workspace-id';
