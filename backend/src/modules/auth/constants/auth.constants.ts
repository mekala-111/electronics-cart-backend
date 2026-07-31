import { cacheKey } from '../../../shared/cache/cache.constants';

export const CUSTOMER_ROLE_CODE = 'customer';
export const CUSTOMER_ROLE_ID = '10000000-0000-0000-0000-000000000003';

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 30;
export const OTP_TTL_MINUTES = 10;
export const REFRESH_DAYS = 7;
export const SESSION_DAYS = 7;

export const AUTH_CACHE_PREFIX = 'auth';

export const authCacheKeys = {
  userRoles: (userId: string) => cacheKey(AUTH_CACHE_PREFIX, 'user', userId, 'roles'),
  userPermissions: (userId: string) =>
    cacheKey(AUTH_CACHE_PREFIX, 'user', userId, 'permissions'),
  otpRateLimit: (destination: string, purpose: string) =>
    cacheKey(AUTH_CACHE_PREFIX, 'otp', destination, purpose),
  loginLockout: (identifier: string) =>
    cacheKey(AUTH_CACHE_PREFIX, 'lockout', identifier),
} as const;
