import type { Request, Response } from 'express';
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

export interface QelosExpressConfig extends QelosConfig {
  /**
   * Optional extra options merged into the per-request SDK instance.
   */
  sdkOptions?: Partial<QelosSDKOptions>;
}

export interface TokenRefreshContext {
  req: Request;
  res: Response;
  oldTokens: QelosTokenPair;
  newTokens: ResolvedTokens;
  sdk: QelosSDK;
}

export type TokenRefreshHook = (ctx: TokenRefreshContext) => void | Promise<void>;

export type QelosRequestContext = QelosContext<QelosSDK, IUser, IWorkspace>;

declare module 'express' {
  interface Request {
    qelos: QelosRequestContext;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    qelos: QelosRequestContext;
  }
}
