import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AnyRequest } from './types';

/**
 * Route-level guard that requires `request.qelos.user` to be populated.
 * Mount on routes that should only run for authenticated users:
 *
 * ```ts
 * @UseGuards(QelosAuthGuard)
 * @Get('me')
 * me() { ... }
 * ```
 *
 * Requires the QelosMiddleware to have run first.
 */
@Injectable()
export class QelosAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AnyRequest>();
    if (!request?.qelos || !request.qelos.user) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
