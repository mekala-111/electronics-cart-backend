import {
  EnvironmentValidationError,
  validateEnvironment,
} from './env.validation';

describe('validateEnvironment', () => {
  const base = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'dev-secret-ok',
    JWT_REFRESH_SECRET: 'dev-refresh-ok',
  };

  const prodBase = {
    ...base,
    NODE_ENV: 'production',
    APP_ENV: 'production',
    JWT_SECRET: 'x'.repeat(32),
    JWT_REFRESH_SECRET: 'y'.repeat(32),
    SMTP_HOST: 'smtp.example.com',
    SWAGGER_ENABLED: 'false',
    PAYMENTS_MOCK: 'false',
    SHIPPING_MOCK: 'false',
    RAZORPAY_KEY_ID: 'rzp_test_x',
    RAZORPAY_KEY_SECRET: 'secretsecret',
    RAZORPAY_WEBHOOK_SECRET: 'whsec_secret',
    SHIPROCKET_EMAIL: 'ops@example.com',
    SHIPROCKET_PASSWORD: 'ship-pass',
    SHIPROCKET_WEBHOOK_SECRET: 'sr_whsec_x',
  };

  it('accepts development with minimal vars', () => {
    expect(() => validateEnvironment({ ...base })).not.toThrow();
  });

  it('rejects production with short JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        ...prodBase,
        JWT_SECRET: 'short',
        JWT_REFRESH_SECRET: 'short2',
      }),
    ).toThrow(EnvironmentValidationError);
  });

  it('rejects production with swagger enabled', () => {
    expect(() =>
      validateEnvironment({
        ...prodBase,
        SWAGGER_ENABLED: 'true',
      }),
    ).toThrow(/SWAGGER_ENABLED/);
  });

  it('rejects production when payment mock is implied by empty keys', () => {
    expect(() =>
      validateEnvironment({
        ...prodBase,
        RAZORPAY_KEY_ID: '',
        RAZORPAY_KEY_SECRET: '',
        RAZORPAY_WEBHOOK_SECRET: '',
        PAYMENTS_MOCK: undefined,
      }),
    ).toThrow(/Payment mock/);
  });

  it('rejects production when shipping mock is implied', () => {
    expect(() =>
      validateEnvironment({
        ...prodBase,
        SHIPROCKET_EMAIL: '',
        SHIPROCKET_PASSWORD: '',
        SHIPPING_MOCK: undefined,
      }),
    ).toThrow(/Shipping mock/);
  });

  it('accepts production with live payment and shipping credentials', () => {
    expect(() => validateEnvironment({ ...prodBase })).not.toThrow();
  });
});
