import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  redisUrl: process.env.QUEUE_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6379',
  prefix: process.env.QUEUE_PREFIX ?? 'electronics:queue:',
  defaultAttempts: Number(process.env.QUEUE_DEFAULT_ATTEMPTS ?? 3),
  defaultBackoffMs: Number(process.env.QUEUE_DEFAULT_BACKOFF_MS ?? 5000),
}));
