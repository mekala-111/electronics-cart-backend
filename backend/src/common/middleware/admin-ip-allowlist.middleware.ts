import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

/**
 * Optional IP allowlist for /api/admin/* when ENFORCE_ADMIN_IP_ALLOWLIST=true.
 */
@Injectable()
export class AdminIpAllowlistMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const enforce = this.config.get<boolean>('security.enforceAdminAllowlist');
    if (!enforce) {
      next();
      return;
    }
    const path = req.originalUrl || req.url || '';
    if (!path.includes('/admin')) {
      next();
      return;
    }
    const allow = this.config.get<string[]>('security.adminIpAllowlist', []);
    if (!allow.length) {
      next();
      return;
    }
    const ip = clientIp(req);
    if (!allow.includes(ip) && !allow.includes('*')) {
      throw new ForbiddenException('Admin access denied from this IP');
    }
    next();
  }
}

export function clientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) {
    return xf.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '';
}
