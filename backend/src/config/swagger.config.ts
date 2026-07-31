import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => {
  const nodeEnv = (process.env.NODE_ENV ?? process.env.APP_ENV ?? '').toLowerCase();
  const prodLike = nodeEnv === 'production' || nodeEnv === 'staging';
  // Production/staging: off unless explicitly enabled (validation should still reject).
  // Development: on unless explicitly disabled.
  const enabled = prodLike
    ? process.env.SWAGGER_ENABLED === 'true' || process.env.SWAGGER_ENABLED === '1'
    : process.env.SWAGGER_ENABLED !== 'false';

  return {
    enabled,
    title: process.env.SWAGGER_TITLE ?? 'Electronics Cart API',
    description:
      process.env.SWAGGER_DESCRIPTION ?? 'Electronics Cart enterprise e-commerce API',
    version: process.env.SWAGGER_VERSION ?? '1.0.0',
    path: 'docs',
  };
});
