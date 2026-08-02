import { registerAs } from '@nestjs/config';
import { AppEnv, parseAppEnv } from './environment';

export default registerAs('app', () => {
  const env = parseAppEnv(process.env.APP_ENV ?? process.env.NODE_ENV);
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    name: process.env.APP_NAME ?? 'Electronics Cart API',
    port: Number(process.env.PORT ?? 3051),
    env,
    apiPrefix: 'api',
    corsOrigins,
    firebaseProjectId:
      process.env.FIREBASE_PROJECT_ID?.trim() || 'electronics-cart',
  } satisfies {
    name: string;
    port: number;
    env: AppEnv;
    apiPrefix: string;
    corsOrigins: string[];
    firebaseProjectId: string;
  };
});
