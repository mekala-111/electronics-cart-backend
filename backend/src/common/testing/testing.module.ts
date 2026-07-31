import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { configLoaders } from '../../config';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { QueueService } from '../../shared/queue/queue.service';
import {
  createMockPrisma,
  createMockRedisCache,
  createMockQueue,
} from '../../../test/mocks';

/** Shared Nest testing module with mocked infra. */
export async function createTestingModule(
  metadata: Parameters<typeof Test.createTestingModule>[0],
): Promise<TestingModule> {
  return Test.createTestingModule({
    ...metadata,
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: configLoaders }),
      ...(metadata.imports ?? []),
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(createMockPrisma())
    .overrideProvider(CacheService)
    .useValue(createMockRedisCache())
    .overrideProvider(QueueService)
    .useValue(createMockQueue())
    .compile();
}
