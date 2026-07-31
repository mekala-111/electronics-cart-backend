import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { DatabaseHealthIndicator } from '../../database/database.health';
import { CacheService } from '../../shared/cache/cache.service';
import { QueueService } from '../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../shared/queue/queue.constants';
import { StorageHealthService } from '../../shared/storage/storage.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly cache: CacheService,
    private readonly storageHealth: StorageHealthService,
    private readonly queues: QueueService,
  ) {}

  /** Liveness — process is up (no dependency checks). */
  @Public()
  @Get()
  getHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Public()
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness — DB + Redis must be reachable before traffic. */
  @Public()
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.databaseHealth.isHealthy('database'),
      async (): Promise<HealthIndicatorResult> => this.redisIndicator(),
    ]);
  }

  @Public()
  @Get('db')
  @HealthCheck()
  checkDb() {
    return this.health.check([
      () => this.databaseHealth.isHealthy('database'),
    ]);
  }

  @Public()
  @Get('redis')
  @HealthCheck()
  checkRedis() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => this.redisIndicator(),
    ]);
  }

  @Public()
  @Get('storage')
  @HealthCheck()
  checkStorage() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        const result = await this.storageHealth.check();
        return {
          storage: {
            status: result.status === 'ok' ? 'up' : 'down',
            ...(result.message ? { message: result.message } : {}),
          },
        };
      },
    ]);
  }

  @Public()
  @Get('queues')
  @HealthCheck()
  checkQueues() {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        try {
          const queue = this.queues.getQueue(QUEUE_NAMES.DEFAULT);
          await queue.getJobCounts();
          return { bullmq: { status: 'up', queue: QUEUE_NAMES.DEFAULT } };
        } catch (error) {
          return {
            bullmq: {
              status: 'down',
              message:
                error instanceof Error ? error.message : 'BullMQ unavailable',
            },
          };
        }
      },
    ]);
  }

  private async redisIndicator(): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.cache.ping();
      const isHealthy = pong === 'PONG';
      return {
        redis: {
          status: isHealthy ? 'up' : 'down',
        },
      };
    } catch (error) {
      return {
        redis: {
          status: 'down',
          message:
            error instanceof Error ? error.message : 'Redis unavailable',
        },
      };
    }
  }
}
