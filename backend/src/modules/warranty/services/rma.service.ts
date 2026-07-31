import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { CaseManager } from '../../../shared/case-management';
import { TransactionContext } from '../../../shared/context/transaction-context';
import { LockService } from '../../../shared/lock/lock.service';
import { SagaCoordinator } from '../../../shared/workflow/saga-coordinator.service';
import type { WorkflowDefinition } from '../../../shared/workflow/workflow.types';
import { RefundService } from '../../payments/services/refund.service';
import { ReverseLogisticsService } from '../../shipping/services/reverse-logistics.service';
import { CreateRmaDto, PatchRmaDto, RmaRefundDto } from '../dto/warranty.dto';
import { RmaApprovedEvent, RmaCreatedEvent } from '../events/warranty.events';
import { WarrantyEventPublisher } from '../events/warranty-event.publisher';
import { WarrantyRepository } from '../repositories/warranty.repository';
import { RmaStore } from '../stores/rma.store';

type RmaCloseCtx = {
  rmaId: string;
  actorId: string;
  paymentId?: string;
  refundAmount?: number;
};

@Injectable()
export class RmaService implements OnModuleInit {
  private readonly logger = new Logger(RmaService.name);

  constructor(
    private readonly repo: WarrantyRepository,
    private readonly locks: LockService,
    private readonly cases: CaseManager,
    private readonly store: RmaStore,
    private readonly events: WarrantyEventPublisher,
    private readonly sagas: SagaCoordinator,
    private readonly refunds: RefundService,
    private readonly reverse: ReverseLogisticsService,
  ) {}

  onModuleInit() {
    this.cases.registerStore('rma', this.store);
  }

  async create(customerId: string, dto: CreateRmaDto) {
    return this.locks.withLock(
      LockService.resourceKey('warranty', 'rma', customerId),
      async () => {
        if (dto.orderId) {
          const order = await this.repo.client.order.findFirst({
            where: { id: dto.orderId, deleted_at: null },
          });
          if (!order) {
            throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
          }
          if (order.customer_id && order.customer_id !== customerId) {
            throw new AppException(ErrorCodes.FORBIDDEN, 'Not your order', 403);
          }
        }

        const rmaNumber = `RMA-${Date.now().toString(36).toUpperCase()}`;
        const row = await this.repo.client.rmaRequest.create({
          data: {
            rma_number: rmaNumber,
            rma_type: dto.rmaType,
            customer_id: customerId,
            order_id: dto.orderId,
            order_item_id: dto.orderItemId,
            claim_id: dto.claimId,
            ticket_id: dto.ticketId,
            serial_number_id: dto.serialNumberId,
            reason: dto.reason,
            status: 'requested',
            created_by: customerId,
          },
        });

        await this.cases.recordOpened(
          { kind: 'rma', id: row.id },
          {
            kind: 'rma',
            id: row.id,
            number: row.rma_number,
            status: 'requested',
            priority: 3,
            openedAt: row.requested_at,
          },
        );

        this.events.rmaCreated(
          new RmaCreatedEvent({
            rmaId: row.id,
            orderId: dto.orderId,
            customerId,
          }),
        );
        await this.repo.audit({
          action: 'rma.create',
          actorId: customerId,
          metadata: { rmaId: row.id },
        });
        this.logger.log(
          `rma created id=${row.id} corr=${TransactionContext.get()?.correlationId}`,
        );
        return {
          id: row.id,
          rmaNumber: row.rma_number,
          status: row.status,
          rmaType: row.rma_type,
        };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async patch(actorId: string, id: string, dto: PatchRmaDto) {
    return this.locks.withLock(
      LockService.resourceKey('warranty', 'rma-patch', id),
      async () => {
        const snap = await this.cases.transition(
          { kind: 'rma', id },
          dto.status,
          { actorId, reason: dto.reason },
        );

        if (dto.status === 'approved') {
          this.events.rmaApproved(new RmaApprovedEvent({ rmaId: id }));
          const rma = await this.repo.client.rmaRequest.findFirst({
            where: { id },
          });
          if (rma?.order_id) {
            try {
              const warehouse = await this.repo.client.warehouse.findFirst({
                where: { deleted_at: null, status: 'active' },
                orderBy: { created_at: 'asc' },
              });
              if (warehouse) {
                await this.reverse.createReverse(actorId, {
                  orderId: rma.order_id,
                  warehouseId: warehouse.id,
                  reverseType: 'warranty_return',
                });
              }
            } catch (err) {
              this.logger.warn(
                `reverse pickup skipped for rma=${id}: ${String(err)}`,
              );
            }
          }
        }

        await this.repo.audit({
          action: `rma.${dto.status}`,
          actorId,
          metadata: { rmaId: id, reason: dto.reason },
        });
        return { id, status: snap.status };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async requestRefund(actorId: string, rmaId: string, dto: RmaRefundDto) {
    const rma = await this.repo.client.rmaRequest.findFirst({
      where: { id: rmaId, deleted_at: null },
    });
    if (!rma) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'RMA not found', 404);
    }
    if (!['received', 'completed', 'approved'].includes(rma.status)) {
      throw new AppException(
        ErrorCodes.CONFLICT,
        'RMA not eligible for refund',
        409,
      );
    }

    const definition: WorkflowDefinition<RmaCloseCtx> = {
      name: 'rma.refund',
      timeoutMs: 30_000,
      steps: [
        {
          name: 'refund_via_payments',
          execute: async (ctx) => {
            await this.refunds.refund(
              ctx.paymentId!,
              ctx.actorId,
              { amount: ctx.refundAmount! },
              true,
            );
            return {};
          },
        },
        {
          name: 'complete_rma',
          execute: async (ctx) => {
            if (rma.status !== 'completed') {
              await this.cases.transition(
                { kind: 'rma', id: ctx.rmaId },
                'completed',
                { actorId: ctx.actorId, reason: 'Refund processed' },
              );
            }
            return {};
          },
        },
      ],
    };

    const result = await this.sagas.run(definition, {
      rmaId,
      actorId,
      paymentId: dto.paymentId,
      refundAmount: dto.amount,
    });

    if (result.status !== 'completed') {
      throw new AppException(
        ErrorCodes.CONFLICT,
        result.error ?? 'RMA refund saga failed',
        409,
      );
    }

    await this.repo.audit({
      action: 'rma.refund',
      actorId,
      metadata: { rmaId, paymentId: dto.paymentId, amount: dto.amount },
    });
    return { rmaId, status: 'completed', workflowId: result.id };
  }

  async get(id: string) {
    const row = await this.repo.client.rmaRequest.findFirst({
      where: { id, deleted_at: null },
    });
    if (!row) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'RMA not found', 404);
    }
    const timeline = await this.cases.timeline({ kind: 'rma', id });
    return {
      id: row.id,
      rmaNumber: row.rma_number,
      rmaType: row.rma_type,
      status: row.status,
      reason: row.reason,
      orderId: row.order_id,
      timeline,
    };
  }
}
