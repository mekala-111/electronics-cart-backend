import { Global, Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { LockService } from './lock.service';

@Global()
@Module({
  imports: [CacheModule],
  providers: [LockService],
  exports: [LockService],
})
export class LockModule {}
