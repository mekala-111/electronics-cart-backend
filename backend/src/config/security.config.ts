import { registerAs } from '@nestjs/config';

export default registerAs('security', () => {
  const adminAllowlist = (process.env.ADMIN_IP_ALLOWLIST ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    trustProxy: process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1',
    adminIpAllowlist: adminAllowlist,
    enforceAdminAllowlist:
      process.env.ENFORCE_ADMIN_IP_ALLOWLIST === 'true' ||
      process.env.ENFORCE_ADMIN_IP_ALLOWLIST === '1',
    hideErrorDetails:
      process.env.NODE_ENV === 'production' ||
      process.env.HIDE_ERROR_DETAILS === 'true',
    hstsMaxAgeSeconds: Number(process.env.HSTS_MAX_AGE_SECONDS ?? 31_536_000),
  };
});
