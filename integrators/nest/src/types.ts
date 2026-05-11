import type QelosSDK from '@qelos/sdk';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import type { QelosSDKOptions } from '@qelos/sdk/types';

/**
 * A request-like object. NestJS can run on either Express or Fastify, so we
 * type the bits we touch generically and feature-detect at runtime.
 */
export interface AnyRequest {
  url?: string;
  path?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  qelos?: QelosRequestContext;
  [key: string]: unknown;
}

/**
 * A response-like object (Express `Response` or Fastify `FastifyReply`).
 */
export interface AnyResponse {
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
   * cookie-based authentication is performed.
   */
  apiToken?: string;
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
   * If true, the catch-all `/api/**` proxy middleware is not registered.
   * Defaults to `false`.
   */
  disableProxy?: boolean;
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
   * SDK instance bound to the current request's cookies. `extraHeaders`
   * re-reads cookies live on each call, so cookie rotations applied by the
   * middleware are picked up automatically.
   */
  sdk: QelosSDK;
}

export interface QelosModuleOptions {
  config: QelosNestConfig;
  /**
   * Resolve the active workspace for a request. Defaults to whatever
   * `/api/me` reports on `user.workspace` (the user's currently activated
   * workspace, or `null` when none is active).
   */
  resolveWorkspace?: WorkspaceResolver;
}
