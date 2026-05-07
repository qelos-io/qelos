import {
  defineEventHandler,
  createError,
  type EventHandlerRequest,
  type EventHandlerResponse,
  type H3Event,
} from 'h3';
import type { QelosRequestContext } from './types';

export interface QelosEventContext<T extends EventHandlerRequest = EventHandlerRequest> {
  event: H3Event<T>;
  qelos: QelosRequestContext;
}

export interface DefineQelosEventHandlerOptions {
  /**
   * Reject the request with `401 Unauthorized` when no authenticated user is
   * resolved on `event.context.qelos`. Defaults to `false`, mirroring the
   * module-level `qelos.requireAuth` behavior.
   */
  requireAuth?: boolean;
}

export type QelosEventHandler<
  Request extends EventHandlerRequest = EventHandlerRequest,
  Response extends EventHandlerResponse = EventHandlerResponse,
> = (ctx: QelosEventContext<Request>) => Response;

/**
 * Wrap a Nitro/H3 event handler so that the Qelos request context (user,
 * workspace, workspaces, sdk, tokens) is available as a second argument and
 * already typed. Requires the `@qelos/integrator-nuxt` module to be enabled
 * (or `createQelosMiddleware` to be registered manually) so that
 * `event.context.qelos` is populated.
 *
 * ```ts
 * // server/api/products.ts
 * import { defineQelosEventHandler } from '@qelos/integrator-nuxt';
 *
 * export default defineQelosEventHandler(async ({ qelos }) => {
 *   return qelos.sdk.entities('products').getList();
 * });
 * ```
 */
export function defineQelosEventHandler<
  Request extends EventHandlerRequest = EventHandlerRequest,
  Response extends EventHandlerResponse = EventHandlerResponse,
>(
  handler: QelosEventHandler<Request, Response>,
  options: DefineQelosEventHandlerOptions = {},
) {
  return defineEventHandler<Request>(async (event) => {
    const qelos = event.context.qelos;
    if (!qelos) {
      throw createError({
        statusCode: 500,
        statusMessage:
          '[@qelos/integrator-nuxt] event.context.qelos is missing. Add the module to nuxt.config or register createQelosMiddleware manually.',
      });
    }
    if (options.requireAuth && !qelos.user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }
    return handler({ event, qelos }) as Response;
  });
}
