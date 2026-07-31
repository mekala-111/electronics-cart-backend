import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configLoaders } from './config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AdminIpAllowlistMiddleware } from './common/middleware/admin-ip-allowlist.middleware';
import { SensitiveAuditMiddleware } from './common/middleware/sensitive-audit.middleware';
import { CoreAuthModule } from './core/auth/core-auth.module';
import { ResponseInterceptor } from './core/response/response.interceptor';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { WarrantyModule } from './modules/warranty/warranty.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TemplateModule } from './modules/template/template.module';
import { CacheModule } from './shared/cache/cache.module';
import { DomainEventsModule } from './shared/events/events.module';
import { TransactionContextInterceptor } from './shared/context/transaction-context.interceptor';
import { TransactionContextModule } from './shared/context/context.module';
import { IdempotencyInterceptor } from './shared/idempotency/idempotency.interceptor';
import { IdempotencyModule } from './shared/idempotency/idempotency.module';
import { LockModule } from './shared/lock/lock.module';
import { AppLoggerModule } from './shared/logger/logger.module';
import { MailModule } from './shared/mail/mail.module';
import { QueueModule } from './shared/queue/queue.module';
import { SocketsModule } from './shared/sockets/sockets.module';
import { StorageModule } from './shared/storage/storage.module';
import { WorkflowModule } from './shared/workflow/workflow.module';
import { StateMachineModule } from './shared/state-machine/state-machine.module';
import { CaseManagementModule } from './shared/case-management/case.module';
import { RulesModule } from './shared/rules/rules.module';
import { MetricsModule } from './shared/metrics/metrics.module';
import { RedisThrottlerStorage } from './shared/throttling/redis-throttler.storage';
import {
  isAdminPath,
  isAuthPath,
  isOtpPath,
  isPaymentPath,
  isUploadPath,
} from './shared/throttling/path-matchers';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: configLoaders,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const storage = new RedisThrottlerStorage(config);
        const ttl = config.get<number>('throttle.defaultTtlMs', 60_000);
        return {
          storage,
          throttlers: [
            {
              name: 'default',
              ttl,
              limit: config.get<number>('throttle.defaultLimit', 120),
            },
            {
              name: 'auth',
              ttl,
              limit: config.get<number>('throttle.authLimit', 30),
              skipIf: (ctx) => !isAuthPath(ctx),
            },
            {
              name: 'otp',
              ttl,
              limit: config.get<number>('throttle.otpLimit', 10),
              skipIf: (ctx) => !isOtpPath(ctx),
            },
            {
              name: 'payment',
              ttl,
              limit: config.get<number>('throttle.paymentLimit', 40),
              skipIf: (ctx) => !isPaymentPath(ctx),
            },
            {
              name: 'admin',
              ttl,
              limit: config.get<number>('throttle.adminLimit', 60),
              skipIf: (ctx) => !isAdminPath(ctx),
            },
            {
              name: 'upload',
              ttl,
              limit: config.get<number>('throttle.uploadLimit', 20),
              skipIf: (ctx) => !isUploadPath(ctx),
            },
          ],
        };
      },
    }),
    AppLoggerModule,
    PrismaModule,
    TransactionContextModule,
    DomainEventsModule,
    WorkflowModule,
    StateMachineModule,
    CaseManagementModule,
    RulesModule,
    MetricsModule,
    CacheModule,
    LockModule,
    IdempotencyModule,
    QueueModule,
    StorageModule,
    MailModule,
    SocketsModule,
    CoreAuthModule,
    AuthModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    WarrantyModule,
    MarketingModule,
    AnalyticsModule,
    HealthModule,
    TemplateModule,
  ],
  providers: [
    AdminIpAllowlistMiddleware,
    SensitiveAuditMiddleware,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TransactionContextInterceptor },
    { provide: APP_INTERCEPTOR, useExisting: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: ValidationExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AdminIpAllowlistMiddleware, SensitiveAuditMiddleware)
      .forRoutes('*');
  }
}
