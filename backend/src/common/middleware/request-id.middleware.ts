import { NextFunction, Request, Response } from 'express';
import { generateUuid } from '../utils/uuid.util';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const existing = req.headers['x-request-id'];
  const requestId =
    typeof existing === 'string' && existing.trim().length > 0
      ? existing.trim()
      : generateUuid();

  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
