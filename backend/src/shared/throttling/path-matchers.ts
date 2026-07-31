import { ExecutionContext } from '@nestjs/common';

function pathOf(context: ExecutionContext): string {
  const req = context.switchToHttp().getRequest<{ url?: string; path?: string; originalUrl?: string }>();
  return (req.originalUrl ?? req.url ?? req.path ?? '').toLowerCase();
}

export function isAuthPath(context: ExecutionContext): boolean {
  const p = pathOf(context);
  return (
    p.includes('/auth/login') ||
    p.includes('/auth/register') ||
    p.includes('/auth/refresh') ||
    p.includes('/auth/forgot-password') ||
    p.includes('/auth/reset-password') ||
    p.includes('/auth/change-password')
  );
}

export function isOtpPath(context: ExecutionContext): boolean {
  const p = pathOf(context);
  return (
    p.includes('/auth/send-otp') ||
    p.includes('/auth/verify-otp') ||
    p.includes('/auth/verify-email') ||
    p.includes('/auth/resend-verification')
  );
}

export function isPaymentPath(context: ExecutionContext): boolean {
  const p = pathOf(context);
  return p.includes('/payments') || p.includes('/payment');
}

export function isAdminPath(context: ExecutionContext): boolean {
  return pathOf(context).includes('/admin/');
}

export function isUploadPath(context: ExecutionContext): boolean {
  const p = pathOf(context);
  return p.includes('/upload') || p.includes('/media') || p.includes('/files');
}
