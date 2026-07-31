import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.SMTP_HOST ?? process.env.MAIL_HOST ?? 'localhost',
  port: Number(process.env.SMTP_PORT ?? process.env.MAIL_PORT ?? 1025),
  user: process.env.SMTP_USER ?? process.env.MAIL_USER ?? '',
  pass: process.env.SMTP_PASS ?? process.env.MAIL_PASS ?? '',
  from:
    process.env.SMTP_FROM ??
    process.env.MAIL_FROM ??
    'noreply@electronics-cart.local',
  secure:
    process.env.SMTP_SECURE === 'true' ||
    process.env.MAIL_SECURE === 'true',
}));
