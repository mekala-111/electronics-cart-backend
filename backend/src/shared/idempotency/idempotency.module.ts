import { Global, Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from './idempotency.service';

@Global()
@Module({
  imports: [CacheModule],
  providers: [IdempotencyService, IdempotencyInterceptor],
  exports: [IdempotencyService, IdempotencyInterceptor],
})
export class IdempotencyModule {}
