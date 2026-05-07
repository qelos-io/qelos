import type QelosSDK from '@qelos/sdk';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import type { QelosSDKOptions } from '@qelos/sdk/types';
import type {
  Handler,
  HandlerContext,
  HandlerEvent,
} from '@netlify/functions';
import type {
  QelosConfig,
  QelosContext,
  QelosTokenPair,
  ResolvedTokens,
} from '@qelos/global-types';

export type { QelosTokenPair, ResolvedTokens } from '@qelos/global-types';

/**
 * Same per-request context type as `@qelos/integrator-express` (`req.qelos`).
 */
export type QelosRequestContext = QelosContext<QelosSDK, IUser, IWorkspace>;

export interface QelosNetlifyConfig extends QelosConfig {
  /**
   * Optional extra options merged into the per-request SDK instance.
   */
  sdkOptions?: Partial<QelosSDKOptions>;
}

export interface TokenRefreshContext {
  event: HandlerEvent;
  /**
   * Collector for `Set-Cookie` header values; merged into the function response by
   * `withQelos` / `requireUser` (same semantics as writing cookies on Express `res`).
   */
  responseCookies: string[];
  oldTokens: QelosTokenPair;
  newTokens: ResolvedTokens;
  sdk: QelosSDK;
}

export type TokenRefreshHook = (ctx: TokenRefreshContext) => void | Promise<void>;

export interface NetlifyIntegratorOptions extends Partial<QelosNetlifyConfig> {
  /**
   * Override tenant resolved via `tenant` header / `QELOS_TENANT`.
   */
  tenant?: string;
  /**
   * Public host forwarded as `tenanthost` on SDK requests. Defaults to
   * `x-forwarded-host`, then `host`, then `rawUrl`.
   */
  tenantHost?: string;
  /**
   * @deprecated Prefer {@link QelosConfig.appUrl}. Resolved via {@link resolveApiHost}
   * when `appUrl` is omitted (same as legacy `QELOS_API_IP`).
   */
  apiHost?: string;
  /**
   * Called after a successful token refresh. Defaults to appending refreshed tokens as
   * `Set-Cookie` entries on {@link TokenRefreshContext.responseCookies}.
   */
  onTokenRefresh?: TokenRefreshHook;
  /**
   * Resolve the active workspace. Defaults to the first workspace from
   * `sdk.workspaces.getList()` (same as Express).
   */
  resolveWorkspace?: (params: {
    event: HandlerEvent;
    user: IUser;
    workspaces: IWorkspace[];
  }) => IWorkspace | null | Promise<IWorkspace | null>;
}

/** Backward-compatible alias for {@link NetlifyIntegratorOptions}. */
export type IntegratorOptions = NetlifyIntegratorOptions;

export interface CreateNetlifySdkParams {
  config: QelosNetlifyConfig;
  tokens: QelosTokenPair;
  event: HandlerEvent;
  /** Mutable list of `Set-Cookie` header line values for the outgoing function response */
  responseCookies: string[];
  onTokenRefresh?: TokenRefreshHook;
  /** Merged into each SDK request (e.g. `tenanthost`, impersonation headers) */
  staticRequestHeaders?: Record<string, string>;
}

/** Alias mirroring `@qelos/integrator-express` naming */
export type CreateSdkParams = CreateNetlifySdkParams;

export interface QelosHandlerEvent extends HandlerEvent {
  qelos?: QelosRequestContext;
}

export type QelosHandler = (
  event: QelosHandlerEvent,
  context: HandlerContext,
) => ReturnType<Handler>;

export function normalizeIntegratorConfig(
  options?: NetlifyIntegratorOptions,
): QelosNetlifyConfig;

export function readTokensFromEvent(
  event: HandlerEvent,
  config: QelosNetlifyConfig,
): QelosTokenPair;

export function createRequestSdk(params: CreateNetlifySdkParams): QelosSDK;

export function identifyUser(
  event: HandlerEvent,
  options?: NetlifyIntegratorOptions,
): Promise<{
  user: IUser;
  workspace: IWorkspace | null;
  workspaces: IWorkspace[];
  sdk: QelosSDK;
  tokens: QelosTokenPair;
  refreshedCookies: string[];
} | null>;

export function withQelos(
  handler: QelosHandler,
  options?: NetlifyIntegratorOptions,
): Handler;

export function requireUser(
  handler: QelosHandler,
  options?: NetlifyIntegratorOptions,
): Handler;

export function resolveApiHost(override?: string): string;
