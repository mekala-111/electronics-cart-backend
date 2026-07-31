import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { LockService } from '../../../shared/lock/lock.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { QueueService } from '../../../shared/queue/queue.service';
import {
  SHIPPING_JOBS,
  SHIPROCKET_PARTNER_ID,
} from '../constants/shipping.constants';
import {
  CarrierWebhookProcessedEvent,
  CarrierWebhookReceivedEvent,
} from '../events/shipping.events';
import { ShippingEventPublisher } from '../events/shipping-event.publisher';
import {
  SHIPPING_PROVIDER,
  type ShippingProvider,
} from '../interfaces/shipping-provider.interface';
import { ShipmentRepository } from '../repositories/shipment.repository';
import { ShippingWebhookRepository } from '../repositories/shipping-webhook.repository';
import { ShippingService } from './shipping.service';

@Injectable()
export class ShippingWebhookService {
  private readonly logger = new Logger(ShippingWebhookService.name);

  constructor(
    private readonly webhooks: ShippingWebhookRepository,
    private readonly shipments: ShipmentRepository,
    private readonly shipping: ShippingService,
    private readonly locks: LockService,
    private readonly events: ShippingEventPublisher,
    private readonly queues: QueueService,
    @Inject(SHIPPING_PROVIDER) private readonly provider: ShippingProvider,
  ) {}

  async receiveShiprocket(input: {
    rawBody: string | Buffer;
    signature: string;
    payload: Record<string, unknown>;
  }) {
    const partner =
      (await this.shipments.findPartnerByCode('shiprocket')) ??
      ({ id: SHIPROCKET_PARTNER_ID } as { id: string });

    if (
      !this.provider.verifyWebhookSignature({
        rawBody: input.rawBody,
        signature: input.signature,
        secret: '',
      })
    ) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Invalid webhook signature',
        401,
      );
    }

    const eventType = String(
      input.payload.event ?? input.payload.current_status ?? 'unknown',
    );
    const awb = String(
      input.payload.awb ??
        input.payload.awb_code ??
        (input.payload as { sr_order_id?: string }).sr_order_id ??
        '',
    );
    const eventId = String(
      (input.payload as { id?: string }).id ?? `${eventType}:${awb}`,
    );
    const idempotencyKey = eventId.slice(0, 128);

    return this.locks.withLock(
      LockService.resourceKey('shipping', 'webhook', idempotencyKey),
      async () => {
        const existing = await this.webhooks.findByIdempotency(
          partner.id,
          idempotencyKey,
        );
        if (existing?.processing_status === 'processed') {
          return { duplicate: true, webhookId: existing.id };
        }
        if (existing) {
          await this.queues.enqueue(
            QUEUE_NAMES.SHIPPING,
            SHIPPING_JOBS.WEBHOOK,
            { webhookId: existing.id },
            { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
          );
          return { duplicate: true, webhookId: existing.id, requeued: true };
        }

        const shipment = awb
          ? await this.shipments.findByTracking(awb)
          : null;

        const row = await this.webhooks.create({
          partner_id: partner.id,
          shipment_id: shipment?.id,
          event_id: eventId.slice(0, 128),
          event_type: eventType.slice(0, 120),
          idempotency_key: idempotencyKey,
          signature: input.signature?.slice(0, 512),
          payload: input.payload as Prisma.InputJsonValue,
          verified: true,
          processing_status: 'verified',
        });

        this.events.webhookReceived(
          new CarrierWebhookReceivedEvent({
            webhookId: row.id,
            carrier: 'shiprocket',
            eventType,
          }),
        );

        await this.queues.enqueue(
          QUEUE_NAMES.SHIPPING,
          SHIPPING_JOBS.WEBHOOK,
          { webhookId: row.id },
          { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
        );

        try {
          await this.processWebhook(row.id);
        } catch (err) {
          this.logger.warn(`inline webhook failed: ${String(err)}`);
        }

        return { duplicate: false, webhookId: row.id };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async processWebhook(webhookId: string): Promise<void> {
    const row = await this.webhooks.findById(webhookId);
    if (!row || row.processing_status === 'processed') return;

    try {
      if (row.shipment_id) {
        await this.shipping.syncTracking(row.shipment_id);
        await this.shipments.appendTrackingEvent({
          shipmentId: row.shipment_id,
          eventStatus: row.event_type,
          description: 'Carrier webhook',
          raw: row.payload as object,
        });
      }

      await this.webhooks.mark(webhookId, 'processed');
      this.events.webhookProcessed(
        new CarrierWebhookProcessedEvent({
          webhookId,
          carrier: 'shiprocket',
          eventType: row.event_type,
          shipmentId: row.shipment_id ?? undefined,
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
