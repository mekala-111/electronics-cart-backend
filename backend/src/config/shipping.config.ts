import { registerAs } from '@nestjs/config';

export default registerAs('shipping', () => {
  const email = process.env.SHIPROCKET_EMAIL ?? '';
  const password = process.env.SHIPROCKET_PASSWORD ?? '';
  const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET ?? '';
  const mockEnv = process.env.SHIPPING_MOCK;
  const mock =
    mockEnv === 'true' ||
    mockEnv === '1' ||
    (!email && !password && mockEnv !== 'false');

  return {
    mock,
    shiprocket: {
      email,
      password,
      webhookSecret,
      baseUrl:
        process.env.SHIPROCKET_BASE_URL ?? 'https://apiv2.shiprocket.in/v1/external',
    },
  };
});
