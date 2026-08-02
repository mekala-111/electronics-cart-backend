import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { LockService } from '../../../shared/lock/lock.service';
import { QueueService } from '../../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { TransactionContext } from '../../../shared/context/transaction-context';
import {
  PAYMENT_JOBS,
  PAYMENT_STATUS,
  PAYMENTS_CACHE,
  RAZORPAY_GATEWAY_ID,
} from '../constants/payments.constants';
import { CreatePaymentDto } from '../dto/payment.dto';
import {
  PaymentAuthorizedEvent,
  PaymentCancelledEvent,
  PaymentCapturedEvent,
  PaymentCreatedEvent,
  PaymentFailedEvent,
  PaymentPendingEvent,
} from '../events/payment.events';
import { PaymentsEventPublisher } from '../events/payments-event.publisher';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../interfaces/payment-provider.interface';
import { mapMethod, mapPayment, mapSavedMethod } from '../mappers/payment.mapper';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentsCacheService } from './payments-cache.service';
import { assertTransition } from '../validators/payment-state.validator';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly repo: PaymentRepository,
    private readonly cache: PaymentsCacheService,
    private readonly locks: LockService,
    private readonly events: PaymentsEventPublisher,
    private readonly queues: QueueService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /** Client Checkout.js path — saga left order pending until capture. */
  private get needsPostCaptureOrderConfirm(): boolean {
    return (
      this.config.get<boolean>('payment.mock') !== true &&
      this.config.get<boolean>('payment.serverCapture') === false
    );
  }

  /** Saga entry: create + return paymentId for subsequent authorize/capture. */
  async createForCheckout(input: {
    orderId: string;
    userId: string;
    amount: number;
    currency?: string;
    paymentMethodId?: string;
  }) {
    return this.create(input.userId, {
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency ?? 'INR',
      paymentMethodId: input.paymentMethodId,
    });
  }

  async create(actorId: string, dto: CreatePaymentDto) {
    const order = await this.repo.client.order.findFirst({
      where: { id: dto.orderId, deleted_at: null },
    });
    if (!order) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    }
    if (order.customer_id && order.customer_id !== actorId) {
      this.assertAdminOrOwner(actorId, order.customer_id, true);
    }
    if (dto.amount < 0) {
      throw new AppException(ErrorCodes.BAD_REQUEST, 'Invalid amount', 400);
    }

    const gateway =
      (await this.repo.findPrimaryGateway()) ??
      (await this.repo.findGatewayByCode('razorpay'));
    if (!gateway) {
      throw new AppException(
        ErrorCodes.INTERNAL_ERROR,
        'Payment gateway unavailable',
        503,
      );
    }

    const receipt = `ord_${order.order_number ?? order.id}`.slice(0, 40);
    const gwOrder = await this.withRetry(() =>
      this.provider.createOrder({
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        receipt,
        notes: {
          orderId: order.id,
          correlationId: TransactionContext.get()?.correlationId ?? '',
        },
      }),
    );

    const payment = await this.repo.create({
      order_id: order.id,
      customer_id: order.customer_id ?? actorId,
      gateway_id: gateway.id,
      payment_method_id: dto.paymentMethodId,
      saved_payment_method_id: dto.savedPaymentMethodId,
      gateway_order_id: gwOrder.gatewayOrderId,
      amount: dto.amount,
      currency: dto.currency ?? 'INR',
      status: PAYMENT_STATUS.PENDING,
      created_by: actorId,
      updated_by: actorId,
    });

    await this.repo.createAttempt({
      payment_id: payment.id,
      customer_id: payment.customer_id,
      attempt_number: 1,
      gateway_response: gwOrder.raw as object,
      status: PAYMENT_STATUS.PENDING,
      completed_at: new Date(),
      created_by: actorId,
    });

    await this.audit(payment.id, 'create', actorId, null, PAYMENT_STATUS.PENDING, {
      gatewayOrderId: gwOrder.gatewayOrderId,
    });
    await this.repo.createEvent(payment.id, 'payment.created', {
      gatewayOrderId: gwOrder.gatewayOrderId,
    });

    const mapped = mapPayment(payment);
    this.events.created(
      new PaymentCreatedEvent({
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        gateway: this.provider.code,
      }),
    );
    this.events.pending(
      new PaymentPendingEvent({
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        gateway: this.provider.code,
      }),
    );

    await this.cache.invalidatePayment(payment.id, payment.order_id);
    this.logger.log(
      `payment created id=${payment.id} order=${payment.order_id} corr=${TransactionContext.get()?.correlationId}`,
    );
    return mapped;
  }

  async authorize(paymentId: string, actorId: string, asAdmin = false) {
    return this.locks.withLock(
      LockService.resourceKey('payments', 'authorize', paymentId),
      async () => {
        const payment = await this.requirePayment(paymentId);
        if (!asAdmin) this.assertCanAccess(payment.customer_id, actorId);
        assertTransition(payment.status, PAYMENT_STATUS.AUTHORIZED);

        const attemptNo = await this.repo.nextAttemptNumber(payment.id);
        try {
          if (!payment.gateway_order_id) {
            throw new AppException(
              ErrorCodes.CONFLICT,
              'Missing gateway order',
              409,
            );
          }

          const result = await this.withRetry(() =>
            this.provider.authorize({
              gatewayOrderId: payment.gateway_order_id!,
              amount: Number(payment.amount),
              currency: payment.currency,
            }),
          );

          if (result.status === 'pending') {
            await this.repo.createAttempt({
              payment_id: payment.id,
              customer_id: payment.customer_id,
              attempt_number: attemptNo,
              gateway_response: result.raw as object,
              status: PAYMENT_STATUS.PENDING,
              completed_at: new Date(),
            });
            return mapPayment(payment);
          }

          if (result.status === 'failed' || !result.gatewayPaymentId) {
            return this.markFailed(payment, actorId, 'Authorization failed', result.raw);
          }

          const updated = await this.repo.update(payment.id, {
            status: PAYMENT_STATUS.AUTHORIZED,
            gateway_payment_id: result.gatewayPaymentId,
            gateway_signature: result.gatewaySignature,
            authorized_at: new Date(),
            updated_by: actorId,
          });

          await this.repo.createTransaction({
            payment_id: payment.id,
            tx_type: 'authorize',
            amount: payment.amount,
            currency: payment.currency,
            gateway_reference: result.gatewayPaymentId,
            raw_response: result.raw as object,
            created_by: actorId,
          });
          await this.repo.createAttempt({
            payment_id: payment.id,
            customer_id: payment.customer_id,
            attempt_number: attemptNo,
            gateway_response: result.raw as object,
            status: PAYMENT_STATUS.AUTHORIZED,
            completed_at: new Date(),
          });
          await this.audit(
            payment.id,
            'authorize',
            actorId,
            payment.status,
            PAYMENT_STATUS.AUTHORIZED,
          );
          await this.repo.createEvent(payment.id, 'payment.authorized');

          this.events.authorized(
            new PaymentAuthorizedEvent({
              paymentId: payment.id,
              orderId: payment.order_id,
              amount: Number(payment.amount),
              currency: payment.currency,
              status: PAYMENT_STATUS.AUTHORIZED,
              gateway: this.provider.code,
            }),
          );
          await this.cache.invalidatePayment(payment.id, payment.order_id);
          return mapPayment(updated);
        } catch (err) {
          await this.repo.createAttempt({
            payment_id: payment.id,
            customer_id: payment.customer_id,
            attempt_number: attemptNo,
            error_message: String(err).slice(0, 2000),
            status: PAYMENT_STATUS.FAILED,
            completed_at: new Date(),
          });
          throw err;
        }
      },
      { ttlMs: 30_000, waitMs: 10_000 },
    );
  }

  async capture(paymentId: string, actorId: string, asAdmin = false) {
    return this.locks.withLock(
      LockService.resourceKey('payments', 'capture', paymentId),
      async () => {
        const payment = await this.requirePayment(paymentId);
        if (!asAdmin) this.assertCanAccess(payment.customer_id, actorId);

        if (payment.status === PAYMENT_STATUS.CAPTURED) {
          return mapPayment(payment);
        }
        assertTransition(payment.status, PAYMENT_STATUS.CAPTURED);

        if (!payment.gateway_payment_id && Number(payment.amount) === 0) {
          const updated = await this.repo.update(payment.id, {
            status: PAYMENT_STATUS.CAPTURED,
            captured_at: new Date(),
            updated_by: actorId,
          });
          await this.audit(
            payment.id,
            'capture',
            actorId,
            payment.status,
            PAYMENT_STATUS.CAPTURED,
          );
          return mapPayment(updated);
        }

        if (!payment.gateway_payment_id) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            'Payment not authorized',
            409,
          );
        }

        const result = await this.withRetry(() =>
          this.provider.capture({
            gatewayPaymentId: payment.gateway_payment_id!,
            amount: Number(payment.amount),
            currency: payment.currency,
          }),
        );

        if (result.status !== 'captured') {
          return this.markFailed(payment, actorId, 'Capture failed', result.raw);
        }

        const updated = await this.repo.update(payment.id, {
          status: PAYMENT_STATUS.CAPTURED,
          captured_at: new Date(),
          updated_by: actorId,
        });

        await this.repo.createTransaction({
          payment_id: payment.id,
          tx_type: 'capture',
          amount: payment.amount,
          currency: payment.currency,
          gateway_reference: result.gatewayPaymentId,
          raw_response: result.raw as object,
          created_by: actorId,
        });
        await this.audit(
          payment.id,
          'capture',
          actorId,
          payment.status,
          PAYMENT_STATUS.CAPTURED,
        );
        await this.repo.createEvent(payment.id, 'payment.captured');

        this.events.captured(
          new PaymentCapturedEvent({
            paymentId: payment.id,
            orderId: payment.order_id,
            amount: Number(payment.amount),
            currency: payment.currency,
            status: PAYMENT_STATUS.CAPTURED,
            gateway: this.provider.code,
          }),
        );

        if (this.needsPostCaptureOrderConfirm) {
          await this.confirmPendingOrderAfterCapture(
            payment.order_id,
            actorId,
          );
        }

        await this.queues.enqueue(
          QUEUE_NAMES.PAYMENTS,
          PAYMENT_JOBS.RECEIPT_EMAIL,
          { paymentId: payment.id, orderId: payment.order_id },
          { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
        );

        await this.cache.invalidatePayment(payment.id, payment.order_id);
        return mapPayment(updated);
      },
      { ttlMs: 30_000, waitMs: 10_000 },
    );
  }

  async cancel(paymentId: string, actorId: string, asAdmin = false) {
    return this.locks.withLock(
      LockService.resourceKey('payments', 'cancel', paymentId),
      async () => {
        const payment = await this.requirePayment(paymentId);
        if (!asAdmin) this.assertCanAccess(payment.customer_id, actorId);

        if (
          payment.status === PAYMENT_STATUS.CANCELLED ||
          payment.status === PAYMENT_STATUS.REFUNDED
        ) {
          return mapPayment(payment);
        }
        if (
          payment.status === PAYMENT_STATUS.CAPTURED ||
          payment.status === PAYMENT_STATUS.PARTIALLY_REFUNDED
        ) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            'Captured payments must be refunded',
            409,
          );
        }

        await this.provider.cancel({
          gatewayPaymentId: payment.gateway_payment_id ?? undefined,
          gatewayOrderId: payment.gateway_order_id ?? undefined,
          amount: Number(payment.amount),
          currency: payment.currency,
        });

        const updated = await this.repo.update(payment.id, {
          status: PAYMENT_STATUS.CANCELLED,
          updated_by: actorId,
        });
        await this.repo.createTransaction({
          payment_id: payment.id,
          tx_type: 'void',
          amount: payment.amount,
          currency: payment.currency,
          gateway_reference: payment.gateway_payment_id,
          created_by: actorId,
        });
        await this.audit(
          payment.id,
          'cancel',
          actorId,
          payment.status,
          PAYMENT_STATUS.CANCELLED,
        );
        await this.repo.createEvent(payment.id, 'payment.cancelled');
        this.events.cancelled(
          new PaymentCancelledEvent({
            paymentId: payment.id,
            orderId: payment.order_id,
            amount: Number(payment.amount),
            currency: payment.currency,
            status: PAYMENT_STATUS.CANCELLED,
            gateway: this.provider.code,
          }),
        );
        await this.cache.invalidatePayment(payment.id, payment.order_id);
        return mapPayment(updated);
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  /** Compensation helper for checkout saga. */
  async voidOrCancel(paymentId: string, actorId: string) {
    const payment = await this.repo.findById(paymentId);
    if (!payment) return;
    if (
      payment.status === PAYMENT_STATUS.CANCELLED ||
      payment.status === PAYMENT_STATUS.FAILED
    ) {
      return;
    }
    try {
      await this.cancel(paymentId, actorId);
    } catch (err) {
      this.logger.warn(`voidOrCancel ${paymentId}: ${String(err)}`);
    }
  }

  async retry(paymentId: string, actorId: string) {
    const payment = await this.requirePayment(paymentId);
    this.assertCanAccess(payment.customer_id, actorId);
    if (
      payment.status !== PAYMENT_STATUS.FAILED &&
      payment.status !== PAYMENT_STATUS.PENDING
    ) {
      throw new AppException(ErrorCodes.CONFLICT, 'Payment not retryable', 409);
    }

    await this.queues.enqueue(
      QUEUE_NAMES.PAYMENTS,
      PAYMENT_JOBS.RETRY,
      { paymentId, actorId },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    if (payment.status === PAYMENT_STATUS.FAILED) {
      await this.repo.update(payment.id, {
        status: PAYMENT_STATUS.PENDING,
        failed_at: null,
        updated_by: actorId,
      });
    }

    const authorized = await this.authorize(paymentId, actorId);
    if (authorized && authorized.status === PAYMENT_STATUS.AUTHORIZED) {
      return this.capture(paymentId, actorId);
    }
    return authorized;
  }

  async getById(paymentId: string, actorId: string, isAdmin = false) {
    return this.cache.getOrSet(PAYMENTS_CACHE.status(paymentId), async () => {
      const payment = await this.requirePayment(paymentId);
      if (!isAdmin) this.assertCanAccess(payment.customer_id, actorId);
      return mapPayment(payment);
    });
  }

  async getByOrder(orderId: string, actorId: string, isAdmin = false) {
    return this.cache.getOrSet(PAYMENTS_CACHE.order(orderId), async () => {
      const rows = await this.repo.findByOrderId(orderId);
      if (!isAdmin) {
        for (const p of rows) this.assertCanAccess(p.customer_id, actorId);
      }
      return rows.map(mapPayment);
    });
  }

  async history(actorId: string, page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const [items, total] = await Promise.all([
      this.repo.history(actorId, skip, take),
      this.repo.historyCount(actorId),
    ]);
    return { items: items.map(mapPayment), total, page, limit: take };
  }

  async listMethods() {
    return this.cache.getOrSet(PAYMENTS_CACHE.methods(), async () => {
      const methods = await this.repo.listMethods();
      return methods.map(mapMethod);
    });
  }

  async listSaved(customerId: string) {
    return this.cache.getOrSet(PAYMENTS_CACHE.saved(customerId), async () => {
      const rows = await this.repo.listSaved(customerId);
      return rows.map(mapSavedMethod);
    });
  }

  async saveMethod(
    customerId: string,
    input: {
      gatewayId: string;
      token: string;
      brand?: string;
      lastFour?: string;
      expiryMonth?: number;
      expiryYear?: number;
      isDefault?: boolean;
    },
  ) {
    if (input.isDefault) {
      await this.repo.client.savedPaymentMethod.updateMany({
        where: { customer_id: customerId, deleted_at: null },
        data: { is_default: false },
      });
    }
    const row = await this.repo.client.savedPaymentMethod.create({
      data: {
        customer_id: customerId,
        gateway_id: input.gatewayId || RAZORPAY_GATEWAY_ID,
        token: input.token,
        brand: input.brand,
        last_four: input.lastFour,
        expiry_month: input.expiryMonth,
        expiry_year: input.expiryYear,
        is_default: input.isDefault ?? false,
        created_by: customerId,
      },
    });
    await this.cache.invalidateSaved(customerId);
    return mapSavedMethod(row);
  }

  async deleteSaved(customerId: string, id: string) {
    const row = await this.repo.client.savedPaymentMethod.findFirst({
      where: { id, customer_id: customerId, deleted_at: null },
    });
    if (!row) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Saved method not found', 404);
    }
    await this.repo.client.savedPaymentMethod.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'inactive' },
    });
    await this.cache.invalidateSaved(customerId);
    return { deleted: true };
  }

  async setDefaultSaved(customerId: string, id: string) {
    const row = await this.repo.client.savedPaymentMethod.findFirst({
      where: { id, customer_id: customerId, deleted_at: null },
    });
    if (!row) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Saved method not found', 404);
    }
    await this.repo.client.savedPaymentMethod.updateMany({
      where: { customer_id: customerId, deleted_at: null },
      data: { is_default: false },
    });
    await this.repo.client.savedPaymentMethod.update({
      where: { id },
      data: { is_default: true },
    });
    await this.cache.invalidateSaved(customerId);
    return this.listSaved(customerId);
  }

  async applyGatewayStatus(
    paymentId: string,
    status: PaymentStatus,
    meta?: { gatewayPaymentId?: string; raw?: object },
  ) {
    const payment = await this.requirePayment(paymentId);
    const data: Record<string, unknown> = {
      status,
      updated_at: new Date(),
    };
    if (meta?.gatewayPaymentId) data.gateway_payment_id = meta.gatewayPaymentId;
    if (status === 'authorized') data.authorized_at = new Date();
    if (status === 'captured') data.captured_at = new Date();
    if (status === 'failed') data.failed_at = new Date();

    const updated = await this.repo.update(paymentId, data);
    await this.audit(paymentId, `webhook.${status}`, undefined, payment.status, status, meta?.raw);
    await this.repo.createEvent(paymentId, `payment.${status}`, meta?.raw as object);
    await this.cache.invalidatePayment(paymentId, payment.order_id);
    return updated;
  }

  private async markFailed(
    payment: Awaited<ReturnType<PaymentRepository['findById']>> & object,
    actorId: string,
    reason: string,
    raw?: object,
  ) {
    if (!payment) throw new AppException(ErrorCodes.NOT_FOUND, 'Payment not found', 404);
    const updated = await this.repo.update(payment.id, {
      status: PAYMENT_STATUS.FAILED,
      failed_at: new Date(),
      updated_by: actorId,
    });
    await this.audit(
      payment.id,
      'fail',
      actorId,
      payment.status,
      PAYMENT_STATUS.FAILED,
      { reason, raw },
    );
    this.events.failed(
      new PaymentFailedEvent({
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: PAYMENT_STATUS.FAILED,
        gateway: this.provider.code,
        reason,
      }),
    );
    await this.cache.invalidatePayment(payment.id, payment.order_id);
    throw new AppException(ErrorCodes.CONFLICT, reason, 409);
  }

  private async requirePayment(id: string) {
    const payment = await this.repo.findById(id);
    if (!payment) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Payment not found', 404);
    }
    return payment;
  }

  /** ponytail: inline order confirm to avoid Orders↔Payments cycle; risk score stays saga-only. */
  private async confirmPendingOrderAfterCapture(
    orderId: string,
    actorId: string,
  ) {
    const order = await this.repo.client.order.findFirst({
      where: { id: orderId, deleted_at: null },
      select: { id: true, status: true, cart_id: true },
    });
    if (!order || order.status !== 'pending') return;

    try {
      await this.repo.client.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'confirmed',
            placed_at: new Date(),
            updated_by: actorId,
          },
        });
        await tx.orderStatusHistory.create({
          data: {
            order_id: orderId,
            from_status: 'pending',
            to_status: 'confirmed',
            note: 'Payment captured',
            created_by: actorId,
            updated_by: actorId,
          },
        });
        if (order.cart_id) {
          await tx.cart.update({
            where: { id: order.cart_id },
            data: { status: 'converted' },
          });
        }
      });
    } catch (err) {
      this.logger.error(
        `confirmPendingOrderAfterCapture failed for ${orderId}: ${String(err)}`,
      );
    }
  }

  private assertCanAccess(customerId: string | null | undefined, actorId: string) {
    if (customerId && customerId !== actorId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Not your payment',
      });
    }
  }

  private assertAdminOrOwner(
    actorId: string,
    ownerId: string,
    _allowAdminFlag: boolean,
  ) {
    if (actorId !== ownerId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Order ownership required',
      });
    }
  }

  private async audit(
    paymentId: string,
    action: string,
    actorId?: string,
    fromStatus?: PaymentStatus | null,
    toStatus?: PaymentStatus | null,
    metadata?: object,
  ) {
    await this.repo.createAudit({
      paymentId,
      action,
      actorId,
      fromStatus,
      toStatus,
      metadata: metadata as object,
    });
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let last: unknown;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        last = err;
        const retryable =
          (err as { retryable?: boolean })?.retryable === true ||
          ((err as { status?: number })?.status ?? 0) >= 500;
        if (!retryable || i === attempts) throw err;
        await new Promise((r) => setTimeout(r, 200 * 2 ** (i - 1)));
      }
    }
    throw last;
  }
}
