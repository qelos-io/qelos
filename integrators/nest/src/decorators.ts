import {
  createParamDecorator,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { QELOS_SDK } from './constants';
import type { AnyRequest, QelosRequestContext } from './types';

/**
 * Inject the full Qelos request context attached by `QelosMiddleware`.
 *
 * ```ts
 * @Get('ctx')
 * ctx(@QelosCtx() ctx: QelosRequestContext) { ... }
 * ```
 */
export const QelosCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): QelosRequestContext | undefined => {
    const request = ctx.switchToHttp().getRequest<AnyRequest>();
    return request?.qelos;
  },
);

/**
 * Inject the authenticated user, or `null` for anonymous requests.
 */
export const QelosUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AnyRequest>();
    return request?.qelos?.user ?? null;
  },
);

/**
 * Inject the active workspace, or `null` when none is active / the user is
 * anonymous.
 */
export const QelosWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AnyRequest>();
    return request?.qelos?.workspace ?? null;
  },
);

/**
 * Inject the per-request Qelos SDK (`request.qelos.sdk`). Requires
 * `QelosModule.forRoot` / `forRootAsync`. For constructor injection into your
 * own providers, set `scope: Scope.REQUEST` on that provider (Nest propagates
 * request scope from controllers).
 *
 * ```ts
 * constructor(@QelosSdk() private readonly sdk: QelosSDK) {}
 * ```
 */
export function QelosSdk(): ReturnType<typeof Inject> {
  return Inject(QELOS_SDK);
}
