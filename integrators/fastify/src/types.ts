import type { FastifyReply, FastifyRequest } from 'fastify';
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

export interface QelosFastifyConfig {
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
   * Defaults to `false` — anonymous requests pass through with `request.qelos.user = null`.
   */
  requireAuth?: boolean;
  /**
   * Skip the plugin entirely for requests whose path starts with any of
   * these prefixes. Useful for `/health`, `/api/_auth`, etc.
   */
  skipPaths?: string[];
  /**
   * Optional extra options merged into the per-request SDK instance.
   */
  sdkOptions?: Partial<QelosSDKOptions>;
}

export interface TokenRefreshContext {
  request: FastifyRequest;
  reply: FastifyReply;
  oldTokens: QelosTokenPair;
  newTokens: ResolvedTokens;
  sdk: QelosSDK;
}

export type TokenRefreshHook = (ctx: TokenRefreshContext) => void | Promise<void>;

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

declare module 'fastify' {
  interface FastifyRequest {
    qelos?: QelosRequestContext;
  }
}
