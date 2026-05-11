import type QelosSDK from '@qelos/sdk';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import type { QelosSDKOptions } from '@qelos/sdk/types';

export interface QelosNuxtRuntimeConfig {
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
   * Path to mount the server middleware on. Defaults to `''` (every request).
   */
  middlewarePath?: string;
  /**
   * If true, the request is rejected (401) when the user cannot be resolved.
   * Defaults to `false` — anonymous requests pass through with `event.context.qelos.user = null`.
   */
  requireAuth?: boolean;
  /**
   * Skip the middleware entirely for requests matching any of these path
   * prefixes. Useful for `/api/_auth`, `/health`, etc.
   */
  skipPaths?: string[];
  /**
   * Optional extra options merged into the per-request SDK instance.
   */
  sdkOptions?: Partial<QelosSDKOptions>;
  /**
   * If true, the catch-all `/api/**` proxy handler is not registered.
   * Defaults to `false`.
   */
  disableProxy?: boolean;
}

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

declare module 'h3' {
  interface H3EventContext {
    qelos?: QelosRequestContext;
  }
}
