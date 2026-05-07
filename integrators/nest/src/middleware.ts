import {
  Inject,
  Injectable,
  UnauthorizedException,
  type NestMiddleware,
} from '@nestjs/common';
import { QELOS_MODULE_OPTIONS } from './constants';
import { createRequestSdk } from './sdk-factory';
import {
  readTokens,
  shouldSkip,
  writeTokensToCookies,
} from './request-utils';
import type {
  AnyRequest,
  AnyResponse,
  QelosModuleOptions,
  QelosRequestContext,
  TokenRefreshHook,
} from './types';

@Injectable()
export class QelosMiddleware implements NestMiddleware {
  constructor(
    @Inject(QELOS_MODULE_OPTIONS)
    private readonly options: QelosModuleOptions,
  ) {}

  async use(req: unknown, res: unknown, next: (err?: unknown) => void): Promise<void> {
    const request = req as AnyRequest;
    const response = res as AnyResponse;
    const { config, resolveWorkspace } = this.options;
    const onTokenRefresh: TokenRefreshHook =
      this.options.onTokenRefresh ||
      (async ({ response: r, newTokens }) => {
        writeTokensToCookies(r, config, newTokens);
      });

    if (shouldSkip(request, config)) {
      next();
      return;
    }

    const tokens = readTokens(request, config);
    const sdk = createRequestSdk({
      config,
      tokens,
      request,
      response,
      onTokenRefresh,
    });

    const ctx: QelosRequestContext = {
      user: null,
      workspace: null,
      workspaces: [],
      sdk,
      tokens,
    };
    request.qelos = ctx;

    const hasAuthMaterial = Boolean(
      config.apiToken || tokens.accessToken || tokens.refreshToken,
    );
    if (!hasAuthMaterial) {
      if (config.requireAuth) {
        next(new UnauthorizedException());
        return;
      }
      next();
      return;
    }

    try {
      ctx.user = await sdk.authentication.getLoggedInUser();
    } catch {
      if (config.requireAuth) {
        next(new UnauthorizedException());
        return;
      }
      next();
      return;
    }

    try {
      ctx.workspaces = await sdk.workspaces.getList();
    } catch {
      ctx.workspaces = [];
    }

    if (ctx.user && ctx.workspaces.length) {
      if (resolveWorkspace) {
        ctx.workspace =
          (await resolveWorkspace({
            request,
            user: ctx.user,
            workspaces: ctx.workspaces,
          })) || null;
      } else {
        ctx.workspace = ctx.workspaces[0] || null;
      }
    }

    next();
  }
}
