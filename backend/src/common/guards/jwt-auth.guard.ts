import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ErrorCodes } from '../../core/errors/error-codes';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../types/auth-user.type';

type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const token = this.extractBearerToken(request);
      if (token) {
        try {
          const payload = await this.jwtService.verifyAsync<Partial<AuthUser>>(token);
          request.user = {
            sub: String(payload.sub),
            email: payload.email,
            mobile: payload.mobile,
            roles: payload.roles ?? [],
            permissions: payload.permissions ?? [],
            sessionId: payload.sessionId,
            tokenFamilyId: payload.tokenFamilyId,
          };
        } catch {
          // public route: ignore invalid token
        }
      }
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Missing access token',
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync<Partial<AuthUser>>(token);
      request.user = {
        sub: String(payload.sub),
        email: payload.email,
        mobile: payload.mobile,
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
        sessionId: payload.sessionId,
        tokenFamilyId: payload.tokenFamilyId,
      };
      return true;
    } catch {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid or expired access token',
      });
    }
  }

  private extractBearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authorization.slice('Bearer '.length).trim();
    return token || undefined;
  }
}
