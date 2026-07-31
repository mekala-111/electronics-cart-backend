import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { QueueService } from '../../../shared/queue/queue.service';
import { BaseWorker } from '../../../shared/queue/worker.base';
import { SHIPPING_JOBS } from '../constants/shipping.constants';
import { ShippingService } from '../services/shipping.service';
import { ShippingWebhookService } from '../services/shipping-webhook.service';

type ShippingJob =
  | { webhookId: string }
  | { shipmentId: string };

@Injectable()
export class ShippingWorker
  extends BaseWorker<ShippingJob>
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    queueService: QueueService,
    config: ConfigService,
    private readonly webhooks: ShippingWebhookService,
    private readonly shipping: ShippingService,
  ) {
    super(
      QUEUE_NAMES.SHIPPING,
      queueService,
      config.getOrThrow<string>('queue.redisUrl'),
    );
  }

  onModuleInit() {
    this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  protected async process(job: Job<ShippingJob>): Promise<void> {
    switch (job.name) {
      case SHIPPING_JOBS.WEBHOOK: {
        const data = job.data as { webhookId: string };
        await this.webhooks.processWebhook(data.webhookId);
        break;
      }
      case SHIPPING_JOBS.TRACKING_SYNC:
      case SHIPPING_JOBS.ETA_REFRESH: {
        const data = job.data as { shipmentId: string };
        await this.shipping.syncTracking(data.shipmentId);
        break;
      }
      case SHIPPING_JOBS.PICKUP_SCHEDULER:
      case SHIPPING_JOBS.CARRIER_RETRY:
      case SHIPPING_JOBS.NOTIFY:
        this.logger.debug(`ack job ${job.name}`);
        break;
      default:
        this.logger.warn(`unknown shipping job ${job.name}`);
    }
  }
}
