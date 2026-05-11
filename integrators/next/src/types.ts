import type QelosSDK from '@qelos/sdk';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import type { QelosSDKOptions } from '@qelos/sdk/types';

export interface QelosNextConfig {
  /**
   * Base URL of the Qelos backend (e.g. https://yourdomain.com).
   */
  appUrl: string;
  /**
   * Static API token used for service-to-service calls. When provided, no
   * cookie-based `/api/me` identification is required for anonymous access.
   */
  apiToken?: string;
  /**
   * If true, the request is rejected (401) when the user cannot be resolved.
   * Defaults to `false` — anonymous requests pass through with `user = null`.
   */
  requireAuth?: boolean;
  /**
   * Skip the middleware / resolver entirely for requests matching any of these
   * path prefixes. Useful for `/_next`, `/favicon.ico`, `/health`, etc.
   */
  skipPaths?: string[];
  /**
   * Optional extra options merged into the per-request SDK instance.
   */
  sdkOptions?: Partial<QelosSDKOptions>;
  /**
   * When `false` (default), Edge middleware prepends `/api/` to `skipPaths` so
   * the catch-all BFF proxy route is not shadowed by the `/api/me` probe.
   */
  disableProxy?: boolean;
}

export interface QelosRequestContext {
  user: IUser | null;
  workspace: IWorkspace | null;
  workspaces: IWorkspace[];
  sdk: QelosSDK;
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
