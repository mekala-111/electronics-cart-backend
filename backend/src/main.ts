import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { Reflector } from '@nestjs/core';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { isProd, parseAppEnv } from './config/environment';
import { validateEnvironment } from './config/env.validation';
import { transactionContextMiddleware } from './shared/context/transaction-context.middleware';

async function bootstrap() {
  validateEnvironment(process.env);

  // Prisma MediaFile.byte_size is BigInt — without this, JSON responses 500
  if (!(BigInt.prototype as { toJSON?: () => string }).toJSON) {
    (BigInt.prototype as { toJSON: () => string }).toJSON = function toJSON() {
      return this.toString();
    };
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(ConfigService);
  const apiPrefix = config.get<string>('app.apiPrefix', 'api');
  const port = config.get<number>('app.port', 3051);
  const corsOrigins = config.get<string[]>('app.corsOrigins', ['*']);
  const trustProxy = config.get<boolean>('security.trustProxy', false);
  const hstsMaxAge = config.get<number>('security.hstsMaxAgeSeconds', 31_536_000);
  const role = (process.env.PROCESS_ROLE ?? 'api').toLowerCase();

  if (trustProxy) {
    app.set('trust proxy', 1);
  }

  app.setGlobalPrefix(apiPrefix);
  app.disable('x-powered-by');
  app.use(transactionContextMiddleware);
  app.use(requestIdMiddleware);

  const prodLike = isProd(
    config.get('app.env') ?? parseAppEnv(process.env.NODE_ENV),
  );
  app.use(
    helmet({
      contentSecurityPolicy: prodLike
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              frameAncestors: ["'none'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      hsts: prodLike
        ? { maxAge: hstsMaxAge, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' },
      xssFilter: true,
      noSniff: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    }),
  );
  app.use((
    _req: import('express').Request,
    res: import('express').Response,
    next: import('express').NextFunction,
  ) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );
    next();
  });
  app.use(
    compression({
      threshold: 1024,
      level: 6,
    }),
  );
  app.enableCors({
    origin:
      corsOrigins.length === 1 && corsOrigins[0] === '*'
        ? true
        : corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(createValidationPipe());
  app.useGlobalInterceptors(new TimeoutInterceptor(app.get(Reflector)));

  const swaggerEnabled = config.get<boolean>(
    'swagger.enabled',
    !prodLike,
  );
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(config.get<string>('swagger.title', 'Electronics Cart API'))
      .setDescription(
        config.get<string>(
          'swagger.description',
          'Electronics Cart enterprise API foundation',
        ),
      )
      .setVersion(config.get<string>('swagger.version', '1.0'))
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('health')
      .addTag('auth')
      .addTag('template')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(
      config.get<string>('swagger.path', 'docs'),
      app,
      document,
    );
  }

  app.enableShutdownHooks();

  if (role === 'worker') {
    await app.init();
    logger.log('Worker process ready (HTTP listener disabled)');
    return;
  }

  await app.listen(port);
  logger.log(`API ready on http://localhost:${port}/${apiPrefix}`);
}

void bootstrap();
