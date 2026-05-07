import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AnyRequest } from './types';

/**
 * Route-level guard that requires `request.qelos.user` to be populated
 * (same contract as Express `requireUser`).
 *
 * ```ts
 * @UseGuards(QelosGuard)
 * @Get('me')
 * me() { ... }
 * ```
 *
 * Requires `QelosMiddleware` to have run first.
 */
@Injectable()
export class QelosGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AnyRequest>();
    if (!request?.qelos || !request.qelos.user) {
      throw new UnauthorizedException();
    }
    return true;
  }
}

/** Previous name for {@link QelosGuard}; kept for compatibility. */
export { QelosGuard as QelosAuthGuard };
