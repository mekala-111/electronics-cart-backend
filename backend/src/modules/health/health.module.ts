import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../../database/database.health';
import { PrismaModule } from '../../database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { QueueModule } from '../../shared/queue/queue.module';
import { StorageModule } from '../../shared/storage/storage.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    PrismaModule,
    CacheModule,
    StorageModule,
    QueueModule,
  ],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator],
})
export class HealthModule {}
