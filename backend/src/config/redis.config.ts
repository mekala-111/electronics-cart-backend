import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'electronics:',
  defaultTtlSeconds: Number(process.env.REDIS_DEFAULT_TTL_SECONDS ?? 3600),
}));
