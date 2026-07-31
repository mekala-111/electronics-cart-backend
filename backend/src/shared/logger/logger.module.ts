import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IncomingMessage } from 'node:http';
import { isDev, AppEnv } from '../../config/environment';
import { TRANSACTION_HEADERS } from '../context/transaction-context';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const env = config.get<AppEnv>('app.env', AppEnv.Development);
        const level = process.env.LOG_LEVEL ?? (isDev(env) ? 'debug' : 'info');

        return {
          pinoHttp: {
            level,
            autoLogging: {
              ignore: (req: IncomingMessage) => {
                const url = req.url ?? '';
                return (
                  url.includes('/health/live') ||
                  url.includes('/health/ready') ||
                  url.endsWith('/health')
                );
              },
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.token',
                'req.body.refreshToken',
                'req.body.otp',
              ],
              remove: true,
            },
            transport: isDev(env)
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                  },
                }
              : undefined,
            customProps: (req: IncomingMessage) => ({
              requestId: req.headers[TRANSACTION_HEADERS.requestId],
              correlationId: req.headers[TRANSACTION_HEADERS.correlationId],
              workflowId: req.headers[TRANSACTION_HEADERS.workflowId],
              tenantId: req.headers[TRANSACTION_HEADERS.tenantId],
              processRole: process.env.PROCESS_ROLE ?? 'api',
            }),
            serializers: {
              req: (req: IncomingMessage & { id?: string }) => ({
                id: req.id,
                method: req.method,
                url: req.url,
              }),
            },
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
