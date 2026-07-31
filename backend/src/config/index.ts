import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import mailConfig from './mail.config';
import paymentConfig from './payment.config';
import queueConfig from './queue.config';
import redisConfig from './redis.config';
import securityConfig from './security.config';
import shippingConfig from './shipping.config';
import storageConfig from './storage.config';
import swaggerConfig from './swagger.config';
import throttleConfig from './throttle.config';

export const configLoaders = [
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  storageConfig,
  mailConfig,
  queueConfig,
  swaggerConfig,
  paymentConfig,
  shippingConfig,
  securityConfig,
  throttleConfig,
];

export {
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  storageConfig,
  mailConfig,
  queueConfig,
  swaggerConfig,
  paymentConfig,
  shippingConfig,
  securityConfig,
  throttleConfig,
};

export * from './environment';
export * from './env.validation';
