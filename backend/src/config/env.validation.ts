import { AppEnv, parseAppEnv } from './environment';

export class EnvironmentValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment:\n- ${issues.join('\n- ')}`);
    this.name = 'EnvironmentValidationError';
  }
}

/**
 * Fail-fast startup validation for production-critical secrets.
 * Safe to call in development (warns on weak secrets only).
 */
export function validateEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const issues: string[] = [];
  const appEnv = parseAppEnv(env.APP_ENV ?? env.NODE_ENV);
  const isProduction =
    appEnv === AppEnv.Production || appEnv === AppEnv.Staging;
  const nodeIsProd =
    parseAppEnv(env.NODE_ENV) === AppEnv.Production ||
    env.NODE_ENV === 'production';

  const require = (key: string, minLen = 1) => {
    const v = env[key]?.trim();
    if (!v || v.length < minLen) {
      issues.push(`${key} is required${minLen > 1 ? ` (min ${minLen} chars)` : ''}`);
    }
    return v;
  };

  require('DATABASE_URL', 10);
  require('REDIS_URL', 8);

  const jwt = require('JWT_SECRET', isProduction ? 32 : 8);
  const jwtRefresh = require('JWT_REFRESH_SECRET', isProduction ? 32 : 8);

  const paymentsMock =
    env.PAYMENTS_MOCK === 'true' ||
    env.PAYMENTS_MOCK === '1' ||
    (!env.RAZORPAY_KEY_ID?.trim() &&
      !env.RAZORPAY_KEY_SECRET?.trim() &&
      env.PAYMENTS_MOCK !== 'false');

  const shippingMock =
    env.SHIPPING_MOCK === 'true' ||
    env.SHIPPING_MOCK === '1' ||
    (!env.SHIPROCKET_EMAIL?.trim() &&
      !env.SHIPROCKET_PASSWORD?.trim() &&
      env.SHIPPING_MOCK !== 'false');

  if (isProduction || nodeIsProd) {
    if (jwt && /change-me|dev-access|dev-refresh|placeholder/i.test(jwt)) {
      issues.push('JWT_SECRET looks like a development placeholder');
    }
    if (jwtRefresh && /change-me|dev-access|dev-refresh|placeholder/i.test(jwtRefresh)) {
      issues.push('JWT_REFRESH_SECRET looks like a development placeholder');
    }
    if (jwt && jwtRefresh && jwt === jwtRefresh) {
      issues.push('JWT_SECRET and JWT_REFRESH_SECRET must differ');
    }
    if (!env.NODE_ENV || parseAppEnv(env.NODE_ENV) !== AppEnv.Production) {
      if (appEnv === AppEnv.Production) {
        issues.push('NODE_ENV must be production when APP_ENV=production');
      }
    }
    if (env.SWAGGER_ENABLED === 'true' || env.SWAGGER_ENABLED === '1') {
      issues.push('SWAGGER_ENABLED must be false in production/staging');
    }
    if (!env.SMTP_HOST?.trim()) {
      issues.push('SMTP_HOST is required in production/staging');
    }
    if (paymentsMock) {
      issues.push(
        'Payment mock is not allowed in production/staging — set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET and PAYMENTS_MOCK=false',
      );
    } else {
      require('RAZORPAY_KEY_ID', 4);
      require('RAZORPAY_KEY_SECRET', 8);
      require('RAZORPAY_WEBHOOK_SECRET', 8);
    }
    if (shippingMock) {
      issues.push(
        'Shipping mock is not allowed in production/staging — set SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, SHIPROCKET_WEBHOOK_SECRET and SHIPPING_MOCK=false',
      );
    } else {
      require('SHIPROCKET_EMAIL', 3);
      require('SHIPROCKET_PASSWORD', 4);
      require('SHIPROCKET_WEBHOOK_SECRET', 8);
    }
    if (
      env.STORAGE_DRIVER === 's3' &&
      (!env.S3_BUCKET || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY)
    ) {
      issues.push('S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY required when STORAGE_DRIVER=s3');
    }
  }

  if (issues.length) {
    throw new EnvironmentValidationError(issues);
  }
}
