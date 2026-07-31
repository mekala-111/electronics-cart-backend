import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { LockService } from '../../../shared/lock/lock.service';
import { QueueService } from '../../../shared/queue/queue.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { PAYMENT_JOBS } from '../constants/payments.constants';
import {
  PaymentDisputeCreatedEvent,
  PaymentSettlementCompletedEvent,
} from '../events/payment.events';
import { PaymentsEventPublisher } from '../events/payments-event.publisher';
import {
  CreateDisputeDto,
  CreateSettlementDto,
  ReconcileDto,
  UpdateDisputeDto,
} from '../dto/payment.dto';
import { PaymentRepository } from '../repositories/payment.repository';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly payments: PaymentRepository,
    private readonly locks: LockService,
    private readonly events: PaymentsEventPublisher,
    private readonly queues: QueueService,
  ) {}

  async createSettlement(actorId: string, dto: CreateSettlementDto) {
    return this.locks.withLock(
      LockService.resourceKey('payments', 'settlement', dto.settlementRef),
      async () => {
        const row = await this.payments.client.paymentSettlement.create({
          data: {
            gateway_id: dto.gatewayId,
            settlement_ref: dto.settlementRef,
            settlement_date: new Date(dto.settlementDate),
            currency: dto.currency ?? 'INR',
            expected_amount: dto.expectedAmount,
            received_amount: dto.receivedAmount,
            fee_amount: dto.feeAmount ?? 0,
            tax_amount: dto.taxAmount ?? 0,
            status:
              Math.abs(dto.expectedAmount - dto.receivedAmount) < 0.01
                ? 'settled'
                : 'pending',
            created_by: actorId,
          },
        });

        if (row.status === 'settled') {
          this.events.settlementCompleted(
            new PaymentSettlementCompletedEvent({
              settlementId: row.id,
              settlementRef: row.settlement_ref,
              receivedAmount: Number(row.received_amount),
              currency: row.currency,
            }),
          );
        }

        await this.queues.enqueue(
          QUEUE_NAMES.PAYMENTS,
          PAYMENT_JOBS.SETTLEMENT_SYNC,
          { settlementId: row.id },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );

        this.logger.log(`settlement ${row.id} ref=${row.settlement_ref}`);
        return {
          id: row.id,
          settlementRef: row.settlement_ref,
          status: row.status,
          expectedAmount: Number(row.expected_amount),
          receivedAmount: Number(row.received_amount),
          currency: row.currency,
        };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async list(gatewayId?: string) {
    const rows = await this.payments.client.paymentSettlement.findMany({
      where: {
        deleted_at: null,
        ...(gatewayId ? { gateway_id: gatewayId } : {}),
      },
      orderBy: { settlement_date: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      settlementRef: r.settlement_ref,
      status: r.status,
      expectedAmount: Number(r.expected_amount),
      receivedAmount: Number(r.received_amount),
      currency: r.currency,
      settlementDate: r.settlement_date,
    }));
  }
}

@Injectable()
export class ReconciliationService {
  constructor(private readonly payments: PaymentRepository) {}

  async reconcile(actorId: string, dto: ReconcileDto) {
    const variance = Number(
      (dto.expectedAmount - dto.receivedAmount).toFixed(2),
    );
    let status:
      | 'matched'
      | 'variance'
      | 'missing_gateway'
      | 'missing_internal'
      | 'unresolved' = 'matched';
    if (Math.abs(variance) >= 0.01) status = 'variance';
    if (!dto.paymentId && dto.gatewayReference) status = 'missing_internal';
    if (dto.paymentId && !dto.gatewayReference && Math.abs(variance) >= 0.01) {
      status = 'missing_gateway';
    }

    const row = await this.payments.client.paymentReconciliation.create({
      data: {
        settlement_id: dto.settlementId,
        payment_id: dto.paymentId,
        gateway_reference: dto.gatewayReference,
        expected_amount: dto.expectedAmount,
        received_amount: dto.receivedAmount,
        variance_amount: variance,
        status,
        notes: dto.notes,
        reconciled_at: status === 'matched' ? new Date() : null,
        created_by: actorId,
      },
    });

    if (dto.paymentId) {
      await this.payments.createAudit({
        paymentId: dto.paymentId,
        action: 'reconciliation',
        actorId,
        metadata: { reconciliationId: row.id, status },
      });
    }

    return {
      id: row.id,
      status: row.status,
      varianceAmount: Number(row.variance_amount),
      expectedAmount: Number(row.expected_amount),
      receivedAmount: Number(row.received_amount),
    };
  }

  async failedTransactionsReport(limit = 50) {
    const rows = await this.payments.client.payment.findMany({
      where: { status: 'failed', deleted_at: null },
      orderBy: { failed_at: 'desc' },
      take: limit,
      include: { gateway: true },
    });
    return rows.map((p) => ({
      id: p.id,
      orderId: p.order_id,
      amount: Number(p.amount),
      currency: p.currency,
      gateway: p.gateway.code,
      failedAt: p.failed_at,
    }));
  }

  async list(status?: string) {
    const rows = await this.payments.client.paymentReconciliation.findMany({
      where: {
        deleted_at: null,
        ...(status
          ? { status: status as 'matched' | 'variance' | 'unresolved' }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      varianceAmount: Number(r.variance_amount),
      paymentId: r.payment_id,
      settlementId: r.settlement_id,
    }));
  }
}

@Injectable()
export class DisputeService {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly events: PaymentsEventPublisher,
  ) {}

  async create(actorId: string, dto: CreateDisputeDto) {
    const payment = await this.payments.findById(dto.paymentId);
    if (!payment) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Payment not found', 404);
    }

    const row = await this.payments.client.paymentDispute.create({
      data: {
        payment_id: payment.id,
        order_id: payment.order_id,
        customer_id: payment.customer_id,
        gateway_dispute_id: dto.gatewayDisputeId,
        reason: dto.reason,
        amount: dto.amount,
        currency: payment.currency,
        status: 'opened',
        created_by: actorId,
      },
    });

    // Evidence metadata stored on audit (no evidence column on disputes)
    await this.payments.createAudit({
      paymentId: payment.id,
      action: 'dispute.create',
      actorId,
      metadata: {
        disputeId: row.id,
        evidence: dto.evidence ?? null,
      } as Prisma.InputJsonValue,
    });

    this.events.disputeCreated(
      new PaymentDisputeCreatedEvent({
        disputeId: row.id,
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: dto.amount,
      }),
    );

    return this.map(row);
  }

  async update(id: string, actorId: string, dto: UpdateDisputeDto) {
    const existing = await this.payments.client.paymentDispute.findFirst({
      where: { id, deleted_at: null },
    });
    if (!existing) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Dispute not found', 404);
    }

    const row = await this.payments.client.paymentDispute.update({
      where: { id },
      data: {
        status: dto.status,
        resolved_at:
          dto.status && ['won', 'lost', 'withdrawn'].includes(dto.status)
            ? new Date()
            : existing.resolved_at,
        updated_by: actorId,
      },
    });

    await this.payments.createAudit({
      paymentId: existing.payment_id,
      action: 'dispute.update',
      actorId,
      metadata: {
        disputeId: id,
        status: dto.status,
        evidence: dto.evidence ?? null,
      } as Prisma.InputJsonValue,
    });

    return this.map(row);
  }

  async get(id: string) {
    const row = await this.payments.client.paymentDispute.findFirst({
      where: { id, deleted_at: null },
    });
    if (!row) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Dispute not found', 404);
    }
    return this.map(row);
  }

  async list(paymentId?: string) {
    const rows = await this.payments.client.paymentDispute.findMany({
      where: {
        deleted_at: null,
        ...(paymentId ? { payment_id: paymentId } : {}),
      },
      orderBy: { opened_at: 'desc' },
      take: 100,
    });
    return rows.map((r) => this.map(r));
  }

  private map(row: {
    id: string;
    payment_id: string;
    order_id: string;
    amount: unknown;
    currency: string;
    status: string;
    reason: string | null;
    gateway_dispute_id: string | null;
    opened_at: Date;
    resolved_at: Date | null;
  }) {
    return {
      id: row.id,
      paymentId: row.payment_id,
      orderId: row.order_id,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
      reason: row.reason,
      gatewayDisputeId: row.gateway_dispute_id,
      openedAt: row.opened_at,
      resolvedAt: row.resolved_at,
    };
  }
}
