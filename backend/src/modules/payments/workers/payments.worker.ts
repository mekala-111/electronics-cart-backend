import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { BaseWorker } from '../../../shared/queue/worker.base';
import { QueueService } from '../../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { PAYMENT_JOBS } from '../constants/payments.constants';
import { PaymentsService } from '../services/payments.service';
import { WebhookService } from '../services/webhook.service';

type PaymentJob =
  | { webhookId: string }
  | { paymentId: string; actorId: string }
  | { refundId: string; paymentId: string; actorId: string }
  | { settlementId: string }
  | { paymentId: string; orderId: string };

@Injectable()
export class PaymentsWorker
  extends BaseWorker<PaymentJob>
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    queueService: QueueService,
    config: ConfigService,
    private readonly webhooks: WebhookService,
    private readonly payments: PaymentsService,
  ) {
    super(
      QUEUE_NAMES.PAYMENTS,
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

  protected async process(job: Job<PaymentJob>): Promise<void> {
    switch (job.name) {
      case PAYMENT_JOBS.WEBHOOK: {
        const data = job.data as { webhookId: string };
        await this.webhooks.processWebhook(data.webhookId);
        break;
      }
      case PAYMENT_JOBS.RETRY: {
        const data = job.data as { paymentId: string; actorId: string };
        await this.payments.authorize(data.paymentId, data.actorId);
        break;
      }
      case PAYMENT_JOBS.SETTLEMENT_SYNC:
      case PAYMENT_JOBS.REFUND:
      case PAYMENT_JOBS.RECEIPT_EMAIL:
        this.logger.debug(`ack job ${job.name}`);
        break;
      default:
        this.logger.warn(`unknown payment job ${job.name}`);
    }
  }
}
