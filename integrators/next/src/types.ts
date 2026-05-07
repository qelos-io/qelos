import type QelosSDK from '@qelos/sdk';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';
import type { QelosSDKOptions } from '@qelos/sdk/types';
import type {
  QelosConfig,
  QelosContext,
  QelosTokenPair,
  ResolvedTokens,
} from '@qelos/global-types';

export type { QelosTokenPair, ResolvedTokens } from '@qelos/global-types';

export interface QelosNextConfig extends QelosConfig {
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

export type QelosRequestContext = QelosContext<QelosSDK, IUser, IWorkspace>;

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
