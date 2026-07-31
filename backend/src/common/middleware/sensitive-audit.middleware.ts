import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/** Audit trail for sensitive admin / auth / payment mutations (infra logging only). */
@Injectable()
export class SensitiveAuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger('SensitiveAudit');

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.originalUrl || req.url || '';
    const method = req.method.toUpperCase();
    const sensitive =
      method !== 'GET' &&
      method !== 'HEAD' &&
      (path.includes('/admin') ||
        path.includes('/auth/') ||
        path.includes('/payments') ||
        path.includes('/payment'));

    if (!sensitive) {
      next();
      return;
    }

    const start = Date.now();
    res.on('finish', () => {
      this.logger.log({
        msg: 'sensitive_request',
        method,
        path: path.split('?')[0],
        status: res.statusCode,
        durationMs: Date.now() - start,
        requestId: req.headers['x-request-id'],
        correlationId: req.headers['x-correlation-id'],
        ip: req.ip,
      });
    });
    next();
  }
}
