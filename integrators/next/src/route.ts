import { NextResponse, type NextRequest } from 'next/server';
import {
  getQelosContext,
  runWithQelosContext,
  type GetQelosContextOptions,
} from './context';
import type { QelosRequestContext } from './types';

export type AppRouteHandler<TContext = unknown> = (
  req: NextRequest,
  context: TContext
) => Response | Promise<Response>;

export type QelosAppRouteHandler<TContext = unknown> = (
  req: NextRequest,
  context: TContext,
  qelos: QelosRequestContext
) => Response | Promise<Response>;

/**
 * Wrap an App Router route handler (e.g. `app/api/foo/route.ts`) so that the
 * Qelos context is resolved and made available both as a third argument and
 * via `getStoredQelosContext()` from anywhere in the handler's async stack.
 * Anonymous requests pass through with `qelos.user = null` unless
 * `options.config.requireAuth` is set.
 *
 * Omit `options` to use the env-derived default config.
 */
export function withQelosRoute<TContext = unknown>(
  handler: QelosAppRouteHandler<TContext>,
  options?: GetQelosContextOptions
): AppRouteHandler<TContext> {
  return async function qelosRouteHandler(req, ctx) {
    const qelos = await getQelosContext(options);
    if (options?.config.requireAuth && !qelos.user) {
      return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
    }
    return await runWithQelosContext(qelos, () =>
      Promise.resolve(handler(req, ctx, qelos))
    ) as Response;
  };
}
