import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { CaseManager } from '../../../shared/case-management';
import { TransactionContext } from '../../../shared/context/transaction-context';
import { LockService } from '../../../shared/lock/lock.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { QueueService } from '../../../shared/queue/queue.service';
import { WARRANTY_CACHE, WARRANTY_JOBS } from '../constants/warranty.constants';
import {
  CreateClaimDto,
  CreatePlanDto,
  PatchClaimDto,
  RegisterWarrantyDto,
} from '../dto/warranty.dto';
import {
  WarrantyClaimApprovedEvent,
  WarrantyClaimCreatedEvent,
  WarrantyClaimRejectedEvent,
  WarrantyRegisteredEvent,
} from '../events/warranty.events';
import { WarrantyEventPublisher } from '../events/warranty-event.publisher';
import { WarrantyRepository } from '../repositories/warranty.repository';
import { WarrantyClaimStore } from '../stores/warranty-claim.store';
import { WarrantyCacheService } from './warranty-cache.service';

@Injectable()
export class WarrantyService implements OnModuleInit {
  private readonly logger = new Logger(WarrantyService.name);

  constructor(
    private readonly repo: WarrantyRepository,
    private readonly cache: WarrantyCacheService,
    private readonly locks: LockService,
    private readonly cases: CaseManager,
    private readonly claimStore: WarrantyClaimStore,
    private readonly events: WarrantyEventPublisher,
    private readonly queues: QueueService,
  ) {}

  onModuleInit() {
    this.cases.registerStore('warranty_claim', this.claimStore);
  }

  listPlans() {
    return this.cache.getOrSet(WARRANTY_CACHE.plans(), async () => {
      const rows = await this.repo.listPlans();
      return rows.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        planType: p.plan_type,
        durationMonths: p.duration_months,
        claimLimit: p.claim_limit != null ? Number(p.claim_limit) : null,
        provider: p.provider
          ? { id: p.provider.id, code: p.provider.code, name: p.provider.name }
          : null,
      }));
    });
  }

  async createPlan(actorId: string, dto: CreatePlanDto) {
    const row = await this.repo.client.warrantyPlan.create({
      data: {
        provider_id: dto.providerId,
        code: dto.code,
        name: dto.name,
        plan_type: dto.planType,
        duration_months: dto.durationMonths,
        claim_limit: dto.claimLimit,
        created_by: actorId,
      },
    });
    await this.cache.invalidatePlans();
    await this.repo.audit({
      action: 'warranty.plan.create',
      actorId,
      metadata: { planId: row.id },
    });
    return { id: row.id, code: row.code, name: row.name };
  }

  async register(customerId: string, dto: RegisterWarrantyDto) {
    return this.locks.withLock(
      LockService.resourceKey('warranty', 'register', customerId),
      async () => {
        const plan = await this.repo.findPlan(dto.planId);
        if (!plan || plan.status !== 'active') {
          throw new AppException(ErrorCodes.BAD_REQUEST, 'Invalid plan', 400);
        }

        let serial = dto.serialNumberId
          ? await this.repo.findSerial(dto.serialNumberId)
          : null;
        if (!serial && dto.serialNumber) {
          serial = await this.repo.findSerialByNumber(dto.serialNumber);
        }
        if (!serial) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Serial not found', 404);
        }

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

        const existing = await this.repo.findActiveRegistrationBySerial(serial.id);
        if (existing) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            'Warranty already active for serial',
            409,
          );
        }

        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + plan.duration_months);
        const registrationNumber = `WR-${Date.now().toString(36).toUpperCase()}`;

        const row = await this.repo.client.warrantyRegistration.create({
          data: {
            registration_number: registrationNumber,
            plan_id: plan.id,
            customer_id: customerId,
            order_id: dto.orderId,
            order_item_id: dto.orderItemId,
            serial_number_id: serial.id,
            variant_id: dto.variantId ?? serial.variant_id,
            purchase_date: dto.purchaseDate
              ? new Date(dto.purchaseDate)
              : undefined,
            start_date: start,
            end_date: end,
            status: 'active',
            created_by: customerId,
          },
        });

        await this.repo.client.serialNumber.update({
          where: { id: serial.id },
          data: { warranty_status: 'active', updated_by: customerId },
        });

        await this.repo.client.warrantyStatusHistory.create({
          data: {
            registration_id: row.id,
            to_status: 'active',
            notes: 'Registered',
            actor_id: customerId,
            changed_at: new Date(),
          },
        });

        this.events.registered(
          new WarrantyRegisteredEvent({
            registrationId: row.id,
            serialNumberId: serial.id,
            planId: plan.id,
            customerId,
          }),
        );
        await this.cache.invalidateSerial(serial.serial_number);
        this.logger.log(
          `warranty registered id=${row.id} serial=${serial.id} corr=${TransactionContext.get()?.correlationId}`,
        );
        return {
          id: row.id,
          registrationNumber: row.registration_number,
          status: row.status,
          startDate: row.start_date,
          endDate: row.end_date,
        };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async checkBySerial(serial: string) {
    return this.cache.getOrSet(WARRANTY_CACHE.serial(serial), async () => {
      const sn = await this.repo.findSerialByNumber(serial);
      if (!sn) {
        throw new AppException(ErrorCodes.NOT_FOUND, 'Serial not found', 404);
      }
      const reg = await this.repo.findActiveRegistrationBySerial(sn.id);
      const now = new Date();
      const active =
        !!reg &&
        reg.status === 'active' &&
        reg.end_date.getTime() >= now.getTime();
      return {
        serialNumber: sn.serial_number,
        serialNumberId: sn.id,
        warrantyTrackStatus: sn.warranty_status,
        registration: reg
          ? {
              id: reg.id,
              status: reg.status,
              startDate: reg.start_date,
              endDate: reg.end_date,
              plan: { id: reg.plan.id, name: reg.plan.name, code: reg.plan.code },
              eligible: active,
            }
          : null,
      };
    });
  }

  async createClaim(customerId: string, dto: CreateClaimDto) {
    return this.locks.withLock(
      LockService.resourceKey('warranty', 'claim', dto.registrationId),
      async () => {
        const reg = await this.repo.findRegistration(dto.registrationId);
        if (!reg) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Registration not found', 404);
        }
        if (reg.customer_id && reg.customer_id !== customerId) {
          throw new AppException(ErrorCodes.FORBIDDEN, 'Not your warranty', 403);
        }
        if (reg.status !== 'active' || reg.end_date < new Date()) {
          throw new AppException(ErrorCodes.CONFLICT, 'Warranty not active', 409);
        }

        const open = await this.repo.client.warrantyClaim.findFirst({
          where: {
            registration_id: reg.id,
            status: { in: ['submitted', 'under_review', 'approved', 'in_service'] },
            deleted_at: null,
          },
        });
        if (open) {
          throw new AppException(ErrorCodes.CONFLICT, 'Open claim already exists', 409);
        }

        const claimNumber = `WC-${Date.now().toString(36).toUpperCase()}`;
        const claim = await this.repo.client.warrantyClaim.create({
          data: {
            claim_number: claimNumber,
            registration_id: reg.id,
            customer_id: customerId,
            serial_number_id: reg.serial_number_id,
            issue_summary: dto.issueSummary,
            issue_detail: dto.issueDetail,
            claim_amount: dto.claimAmount,
            status: 'submitted',
            created_by: customerId,
          },
        });

        await this.cases.recordOpened(
          { kind: 'warranty_claim', id: claim.id },
          {
            kind: 'warranty_claim',
            id: claim.id,
            number: claim.claim_number,
            status: 'submitted',
            priority: 3,
            openedAt: claim.submitted_at,
          },
        );

        this.events.claimCreated(
          new WarrantyClaimCreatedEvent({
            claimId: claim.id,
            registrationId: reg.id,
            customerId,
          }),
        );
        await this.queues.enqueue(QUEUE_NAMES.WARRANTY, WARRANTY_JOBS.CLAIM_REVIEW, {
          claimId: claim.id,
        });
        await this.repo.audit({
          action: 'warranty.claim.create',
          actorId: customerId,
          claimId: claim.id,
        });
        return {
          id: claim.id,
          claimNumber: claim.claim_number,
          status: claim.status,
        };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async getClaim(id: string, customerId?: string) {
    return this.cache.getOrSet(WARRANTY_CACHE.claim(id), async () => {
      const claim = await this.repo.findClaim(id);
      if (!claim) {
        throw new AppException(ErrorCodes.NOT_FOUND, 'Claim not found', 404);
      }
      if (
        customerId &&
        claim.customer_id &&
        claim.customer_id !== customerId
      ) {
        throw new AppException(ErrorCodes.FORBIDDEN, 'Not your claim', 403);
      }
      const timeline = await this.cases.timeline({
        kind: 'warranty_claim',
        id,
      });
      return {
        id: claim.id,
        claimNumber: claim.claim_number,
        status: claim.status,
        issueSummary: claim.issue_summary,
        issueDetail: claim.issue_detail,
        claimAmount:
          claim.claim_amount != null ? Number(claim.claim_amount) : null,
        registrationId: claim.registration_id,
        documents: claim.documents.map((d) => ({
          id: d.id,
          docType: d.doc_type,
          label: d.label,
        })),
        timeline,
      };
    });
  }

  async patchClaim(actorId: string, id: string, dto: PatchClaimDto) {
    return this.locks.withLock(
      LockService.resourceKey('warranty', 'claim-approve', id),
      async () => {
        const ref = { kind: 'warranty_claim' as const, id };
        const snap = await this.cases.transition(ref, dto.status, {
          actorId,
          reason: dto.reason,
        });

        if (dto.status === 'approved') {
          this.events.claimApproved(new WarrantyClaimApprovedEvent({ claimId: id }));
        }
        if (dto.status === 'rejected') {
          this.events.claimRejected(
            new WarrantyClaimRejectedEvent({ claimId: id, reason: dto.reason }),
          );
        }

        await this.repo.audit({
          action: `warranty.claim.${dto.status}`,
          actorId,
          claimId: id,
          metadata: { reason: dto.reason },
        });
        await this.cache.invalidateClaim(id);
        return { id, status: snap.status };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async deviceHistory(serialNumberId: string) {
    return this.cache.getOrSet(WARRANTY_CACHE.device(serialNumberId), async () => {
      const [regs, claims, tickets, rmas, health] = await Promise.all([
        this.repo.client.warrantyRegistration.findMany({
          where: { serial_number_id: serialNumberId, deleted_at: null },
        }),
        this.repo.client.warrantyClaim.findMany({
          where: { serial_number_id: serialNumberId, deleted_at: null },
        }),
        this.repo.client.serviceTicket.findMany({
          where: { serial_number_id: serialNumberId, deleted_at: null },
        }),
        this.repo.client.rmaRequest.findMany({
          where: { serial_number_id: serialNumberId, deleted_at: null },
        }),
        this.repo.client.deviceHealthReport.findMany({
          where: { serial_number_id: serialNumberId, deleted_at: null },
          orderBy: { reported_at: 'desc' },
          take: 10,
        }),
      ]);
      return { registrations: regs, claims, tickets, rmas, healthReports: health };
    });
  }

  async extend(actorId: string, registrationId: string, planId: string, purchaseAmount?: number) {
    const reg = await this.repo.findRegistration(registrationId);
    if (!reg) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Registration not found', 404);
    }
    const plan = await this.repo.findPlan(planId);
    if (!plan || plan.status !== 'active') {
      throw new AppException(ErrorCodes.BAD_REQUEST, 'Invalid plan', 400);
    }

    const start = reg.end_date > new Date() ? reg.end_date : new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + plan.duration_months);

    const ext = await this.repo.client.$transaction(async (tx) => {
      const row = await tx.warrantyExtension.create({
        data: {
          registration_id: registrationId,
          plan_id: planId,
          start_date: start,
          end_date: end,
          purchase_amount: purchaseAmount,
          created_by: actorId,
        },
      });
      await tx.warrantyRegistration.update({
        where: { id: registrationId },
        data: { end_date: end, updated_by: actorId },
      });
      return row;
    });

    await this.repo.audit({
      action: 'warranty.extend',
      actorId,
      metadata: { extensionId: ext.id, registrationId },
    });
    if (reg.serial_number?.serial_number) {
      await this.cache.invalidateSerial(reg.serial_number.serial_number);
    }
    return {
      id: ext.id,
      registrationId,
      startDate: ext.start_date,
      endDate: ext.end_date,
    };
  }

  async transfer(actorId: string, registrationId: string, toCustomerId: string) {
    return this.locks.withLock(
      LockService.resourceKey('warranty', 'transfer', registrationId),
      async () => {
        const reg = await this.repo.findRegistration(registrationId);
        if (!reg) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Registration not found', 404);
        }
        if (reg.status !== 'active') {
          throw new AppException(ErrorCodes.CONFLICT, 'Warranty not active', 409);
        }
        await this.repo.client.warrantyRegistration.update({
          where: { id: registrationId },
          data: { customer_id: toCustomerId, updated_by: actorId },
        });
        await this.repo.client.warrantyStatusHistory.create({
          data: {
            registration_id: registrationId,
            to_status: 'active',
            notes: `Transferred to ${toCustomerId}`,
            actor_id: actorId,
            changed_at: new Date(),
          },
        });
        await this.repo.audit({
          action: 'warranty.transfer',
          actorId,
          metadata: { registrationId, toCustomerId },
        });
        return { id: registrationId, customerId: toCustomerId };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }
}
