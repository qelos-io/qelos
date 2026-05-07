/**
 * Shared contracts every Qelos framework integrator (`@qelos/integrator-*`)
 * builds upon. Defined here — rather than in each integrator — so the
 * per-request shape and configuration surface are guaranteed identical across
 * frameworks.
 *
 * `@qelos/sdk` depends on `@qelos/global-types`, so this file deliberately
 * avoids importing from the SDK; instead, {@link QelosContext} is generic over
 * the SDK instance type and integrators specialize it with the concrete
 * `QelosSDK` / `IUser` / `IWorkspace` types from `@qelos/sdk`.
 */

/**
 * Tokens read from an inbound request. Integrators mutate this object in place
 * when a refresh occurs so later code can read the current pair.
 */
export interface QelosTokenPair {
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Result of a successful token refresh.
 */
export interface ResolvedTokens {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Minimal user contract shared by all integrators. The SDK's `IUser` (rich,
 * with first/last name, metadata, etc.) is assignable to this and is what
 * integrators actually plug in via the `TUser` parameter on
 * {@link QelosContext}.
 */
export interface IQelosUser {
  _id: string;
  username: string;
  email: string;
  roles: string[];

  [key: string]: any;
}

/**
 * Minimal workspace contract shared by all integrators. The SDK's `IWorkspace`
 * is assignable to this.
 */
export interface IQelosWorkspace {
  name: string;

  [key: string]: any;
}

/**
 * Base configuration contract every framework integrator builds upon.
 * Framework-specific configs (e.g. `QelosExpressConfig`, `QelosNextConfig`)
 * extend this with transport-specific options such as `sdkOptions`.
 */
export interface QelosConfig {
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
   * If true, the integrator rejects requests (401) when the user cannot be
   * resolved. Defaults to `false` — anonymous requests pass through with
   * `qelos.user = null`.
   */
  requireAuth?: boolean;
  /**
   * Skip the integrator entirely for requests whose path starts with any of
   * these prefixes. Useful for `/health`, `/_next`, `/api/_auth`, etc.
   */
  skipPaths?: string[];
}

/**
 * Per-request Qelos context every integrator produces. Generic over the SDK
 * instance type and the user/workspace shape so framework integrators narrow
 * these to the SDK's concrete types (`QelosSDK`, `IUser`, `IWorkspace`)
 * without dragging the SDK into `@qelos/global-types`.
 */
export interface QelosContext<
  TSdk = unknown,
  TUser extends IQelosUser = IQelosUser,
  TWorkspace extends IQelosWorkspace = IQelosWorkspace,
> {
  /**
   * The authenticated user, or `null` when anonymous.
   */
  user: TUser | null;
  /**
   * The active workspace for the request, or `null` when none is active /
   * the user is anonymous.
   */
  workspace: TWorkspace | null;
  /**
   * The full list of workspaces the user has access to.
   */
  workspaces: TWorkspace[];
  /**
   * SDK instance bound to the current request's tokens.
   */
  sdk: TSdk;
  /**
   * Tokens read from the request. Mutated in place when a refresh occurs so
   * later code can read the current pair.
   */
  tokens: QelosTokenPair;
}
