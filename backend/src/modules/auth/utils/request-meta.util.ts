import { Request } from 'express';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export function extractRequestMeta(request: Request): RequestMeta {
  const forwarded = request.headers['x-forwarded-for'];
  const forwardedIp =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : undefined;

  return {
    ipAddress: forwardedIp ?? request.ip,
    userAgent: request.headers['user-agent'],
    requestId:
      typeof request.headers['x-request-id'] === 'string'
        ? request.headers['x-request-id']
        : undefined,
  };
}
