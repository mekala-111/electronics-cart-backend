import { registerAs } from '@nestjs/config';

function num(key: string, fallback: number): number {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export default registerAs('throttle', () => ({
  defaultTtlMs: num('THROTTLE_TTL_MS', 60_000),
  defaultLimit: num('THROTTLE_LIMIT', 120),
  authLimit: num('THROTTLE_AUTH_LIMIT', 30),
  otpLimit: num('THROTTLE_OTP_LIMIT', 10),
  paymentLimit: num('THROTTLE_PAYMENT_LIMIT', 40),
  adminLimit: num('THROTTLE_ADMIN_LIMIT', 60),
  uploadLimit: num('THROTTLE_UPLOAD_LIMIT', 20),
}));
