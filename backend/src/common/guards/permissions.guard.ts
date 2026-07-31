import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '../../core/errors/error-codes';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const userPermissions = request.user?.permissions ?? [];
    const allowed = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!allowed) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Insufficient permissions',
      });
    }

    return true;
  }
}
