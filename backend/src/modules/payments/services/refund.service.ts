import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { LockService } from '../../../shared/lock/lock.service';
import { QueueService } from '../../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { PAYMENT_JOBS, PAYMENT_STATUS } from '../constants/payments.constants';
import { RefundPaymentDto } from '../dto/payment.dto';
import {
  PaymentPartiallyRefundedEvent,
  PaymentRefundedEvent,
} from '../events/payment.events';
import { PaymentsEventPublisher } from '../events/payments-event.publisher';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../interfaces/payment-provider.interface';
import { mapRefund } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { PaymentsCacheService } from './payments-cache.service';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly payments: PaymentRepository,
    private readonly refunds: RefundRepository,
    private readonly locks: LockService,
    private readonly events: PaymentsEventPublisher,
    private readonly cache: PaymentsCacheService,
    private readonly queues: QueueService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async refund(
    paymentId: string,
    actorId: string,
    dto: RefundPaymentDto,
    asAdmin = false,
  ) {
    return this.locks.withLock(
      LockService.resourceKey('payments', 'refund', paymentId),
      async () => {
        const payment = await this.payments.findById(paymentId);
        if (!payment) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Payment not found', 404);
        }
        if (!asAdmin && payment.customer_id && payment.customer_id !== actorId) {
          throw new AppException(ErrorCodes.FORBIDDEN, 'Not your payment', 403);
        }
        if (
          payment.status !== PAYMENT_STATUS.CAPTURED &&
          payment.status !== PAYMENT_STATUS.PARTIALLY_REFUNDED
        ) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            'Only captured payments can be refunded',
            409,
          );
        }

        const already = Number(payment.refunded_amount);
        const total = Number(payment.amount);
        const remaining = total - already;
        if (dto.amount > remaining + 0.001) {
          throw new AppException(
            ErrorCodes.BAD_REQUEST,
            `Refund exceeds remaining amount (${remaining})`,
            400,
          );
        }

        const refundType = dto.amount >= remaining - 0.001 ? 'full' : 'partial';
        const refundNumber = `RFN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        let refund = await this.refunds.create({
          refund_number: refundNumber,
          payment_id: payment.id,
          order_id: payment.order_id,
          requested_by_id: actorId,
          refund_type: refundType,
          amount: dto.amount,
          currency: payment.currency,
          reason_code: dto.reasonCode,
          reason: dto.reason,
          status: 'processing',
          created_by: actorId,
        });

        if (dto.items?.length) {
          await this.payments.client.refundItem.createMany({
            data: dto.items.map((i) => ({
              refund_id: refund.id,
              order_item_id: i.orderItemId,
              amount: i.amount,
              quantity: i.quantity,
              created_by: actorId,
            })),
          });
        }

        if (!payment.gateway_payment_id) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            'Missing gateway payment id',
            409,
          );
        }

        try {
          const gw = await this.provider.refund({
            gatewayPaymentId: payment.gateway_payment_id,
            amount: dto.amount,
            currency: payment.currency,
            notes: { refundNumber, reason: dto.reason ?? '' },
          });

          refund = await this.refunds.update(refund.id, {
            status: gw.status === 'processed' ? 'processed' : 'processing',
            gateway_refund_id: gw.gatewayRefundId,
            gateway_reference: gw.gatewayRefundId,
            processed_at: gw.status === 'processed' ? new Date() : null,
            approved_at: new Date(),
          });

          await this.payments.createTransaction({
            payment_id: payment.id,
            tx_type: 'refund',
            amount: dto.amount,
            currency: payment.currency,
            gateway_reference: gw.gatewayRefundId,
            raw_response: gw.raw as object,
            created_by: actorId,
          });

          const newRefunded = already + dto.amount;
          const newStatus =
            newRefunded >= total - 0.001
              ? PAYMENT_STATUS.REFUNDED
              : PAYMENT_STATUS.PARTIALLY_REFUNDED;

          await this.payments.update(payment.id, {
            refunded_amount: newRefunded,
            status: newStatus,
            updated_by: actorId,
          });

          await this.payments.createAudit({
            paymentId: payment.id,
            action: 'refund',
            actorId,
            fromStatus: payment.status,
            toStatus: newStatus,
            metadata: { refundId: refund.id, amount: dto.amount },
          });
          await this.payments.createEvent(payment.id, `payment.${newStatus}`, {
            refundId: refund.id,
          });

          const payload = {
            paymentId: payment.id,
            orderId: payment.order_id,
            amount: Number(payment.amount),
            currency: payment.currency,
            status: newStatus,
            gateway: this.provider.code,
            refundId: refund.id,
            refundAmount: dto.amount,
          };
          if (newStatus === PAYMENT_STATUS.REFUNDED) {
            this.events.refunded(new PaymentRefundedEvent(payload));
          } else {
            this.events.partiallyRefunded(
              new PaymentPartiallyRefundedEvent(payload),
            );
          }

          await this.cache.invalidatePayment(payment.id, payment.order_id);
          this.logger.log(
            `refund ${refund.id} payment=${payment.id} amount=${dto.amount}`,
          );
          return mapRefund(refund);
        } catch (err) {
          await this.refunds.update(refund.id, {
            status: 'failed',
            reason: String(err).slice(0, 500),
          });
          await this.queues.enqueue(
            QUEUE_NAMES.PAYMENTS,
            PAYMENT_JOBS.REFUND,
            { refundId: refund.id, paymentId: payment.id, actorId },
            { attempts: 5, backoff: { type: 'exponential', delay: 3000 } },
          );
          throw err;
        }
      },
      { ttlMs: 45_000, waitMs: 10_000 },
    );
  }

  async listForPayment(paymentId: string) {
    const rows = await this.refunds.findByPayment(paymentId);
    return rows.map(mapRefund);
  }
}
