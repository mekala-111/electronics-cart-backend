import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { LockService } from '../../../shared/lock/lock.service';
import { QueueService } from '../../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import {
  PAYMENT_JOBS,
  PAYMENT_STATUS,
  RAZORPAY_GATEWAY_ID,
} from '../constants/payments.constants';
import {
  PaymentWebhookProcessedEvent,
  PaymentWebhookReceivedEvent,
} from '../events/payment.events';
import { PaymentsEventPublisher } from '../events/payments-event.publisher';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../interfaces/payment-provider.interface';
import { PaymentRepository } from '../repositories/payment.repository';
import { WebhookRepository } from '../repositories/webhook.repository';
import { PaymentsService } from './payments.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly webhooks: WebhookRepository,
    private readonly paymentsRepo: PaymentRepository,
    private readonly payments: PaymentsService,
    private readonly locks: LockService,
    private readonly events: PaymentsEventPublisher,
    private readonly queues: QueueService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async receiveRazorpay(input: {
    rawBody: string | Buffer;
    signature: string;
    payload: Record<string, unknown>;
  }) {
    const gateway =
      (await this.paymentsRepo.findGatewayByCode('razorpay')) ??
      ({ id: RAZORPAY_GATEWAY_ID } as { id: string });

    const verified = this.provider.verifyWebhookSignature({
      rawBody: input.rawBody,
      signature: input.signature,
      secret: '',
    });
    if (!verified) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Invalid webhook signature',
        401,
      );
    }

    const eventType = String(input.payload.event ?? 'unknown');
    const paymentEntity = (
      input.payload.payload as {
        payment?: { entity?: { id?: string; order_id?: string; status?: string } };
      }
    )?.payment?.entity;
    const eventId =
      String((input.payload as { id?: string }).id ?? paymentEntity?.id ?? '') ||
      undefined;
    const idempotencyKey = (
      eventId || `${eventType}:${JSON.stringify(input.payload).slice(0, 80)}`
    ).slice(0, 128);

    return this.locks.withLock(
      LockService.resourceKey('payments', 'webhook', idempotencyKey),
      async () => {
        const existing = await this.webhooks.findByIdempotency(
          gateway.id,
          idempotencyKey,
        );
        if (existing?.processing_status === 'processed') {
          return { duplicate: true, webhookId: existing.id };
        }
        if (existing) {
          await this.queues.enqueue(
            QUEUE_NAMES.PAYMENTS,
            PAYMENT_JOBS.WEBHOOK,
            { webhookId: existing.id },
            { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
          );
          return { duplicate: true, webhookId: existing.id, requeued: true };
        }

        const row = await this.webhooks.create({
          gateway_id: gateway.id,
          event_id: eventId,
          event_type: eventType.slice(0, 120),
          idempotency_key: idempotencyKey,
          signature: input.signature?.slice(0, 512),
          payload: input.payload as Prisma.InputJsonValue,
          verified: true,
          processing_status: 'verified',
        });

        this.events.webhookReceived(
          new PaymentWebhookReceivedEvent({
            webhookId: row.id,
            gateway: 'razorpay',
            eventType,
          }),
        );

        await this.queues.enqueue(
          QUEUE_NAMES.PAYMENTS,
          PAYMENT_JOBS.WEBHOOK,
          { webhookId: row.id },
          { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
        );

        try {
          await this.processWebhook(row.id);
        } catch (err) {
          this.logger.warn(`inline webhook process failed: ${String(err)}`);
        }

        return { duplicate: false, webhookId: row.id };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async processWebhook(webhookId: string): Promise<void> {
    const row = await this.paymentsRepo.client.paymentWebhook.findFirst({
      where: { id: webhookId, deleted_at: null },
    });
    if (!row || row.processing_status === 'processed') return;

    try {
      const payload = row.payload as Record<string, unknown>;
      const entity = (
        payload.payload as {
          payment?: {
            entity?: {
              id?: string;
              order_id?: string;
              status?: string;
              payment_id?: string;
            };
          };
        }
      )?.payment?.entity;

      const gatewayPaymentId = entity
        ? String(entity.id ?? entity.payment_id ?? '')
        : '';
      let payment = gatewayPaymentId
        ? await this.paymentsRepo.findByGatewayPaymentId(gatewayPaymentId)
        : null;

      if (!payment && entity?.order_id) {
        payment = await this.paymentsRepo.client.payment.findFirst({
          where: {
            gateway_order_id: String(entity.order_id),
            deleted_at: null,
          },
          include: { gateway: true },
        });
      }

      if (payment) {
        const eventType = row.event_type;
        if (
          eventType.includes('authorized') ||
          entity?.status === 'authorized'
        ) {
          await this.payments.applyGatewayStatus(
            payment.id,
            PAYMENT_STATUS.AUTHORIZED,
            {
              gatewayPaymentId:
                gatewayPaymentId || payment.gateway_payment_id || undefined,
              raw: payload,
            },
          );
        } else if (
          eventType.includes('captured') ||
          entity?.status === 'captured'
        ) {
          await this.payments.applyGatewayStatus(
            payment.id,
            PAYMENT_STATUS.CAPTURED,
            {
              gatewayPaymentId:
                gatewayPaymentId || payment.gateway_payment_id || undefined,
              raw: payload,
            },
          );
        } else if (
          eventType.includes('failed') ||
          entity?.status === 'failed'
        ) {
          await this.payments.applyGatewayStatus(
            payment.id,
            PAYMENT_STATUS.FAILED,
            { raw: payload },
          );
        }

        await this.paymentsRepo.createAudit({
          paymentId: payment.id,
          action: 'webhook',
          metadata: { webhookId, eventType: row.event_type },
        });
      }

      await this.webhooks.mark(webhookId, 'processed');
      this.events.webhookProcessed(
        new PaymentWebhookProcessedEvent({
          webhookId,
          gateway: 'razorpay',
          eventType: row.event_type,
          paymentId: payment?.id,
        }),
      );
    } catch (err) {
      await this.webhooks.mark(webhookId, 'failed', {
        error_message: String(err).slice(0, 2000),
        retry_count: { increment: 1 },
      });
      throw err;
    }
  }
}
