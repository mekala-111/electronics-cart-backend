import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => {
  const keyId = process.env.RAZORPAY_KEY_ID ?? '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
  const mockEnv = process.env.PAYMENTS_MOCK;
  const mock =
    mockEnv === 'true' ||
    mockEnv === '1' ||
    (!keyId && !keySecret && mockEnv !== 'false');

  return {
    mock,
    razorpay: {
      keyId,
      keySecret,
      webhookSecret,
      baseUrl: process.env.RAZORPAY_BASE_URL ?? 'https://api.razorpay.com/v1',
    },
    currencyDefault: process.env.PAYMENTS_DEFAULT_CURRENCY ?? 'INR',
    authorizeTimeoutMs: Number(process.env.PAYMENTS_AUTHORIZE_TIMEOUT_MS ?? 30_000),
  };
});
