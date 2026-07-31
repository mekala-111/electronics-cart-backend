import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { CaseManager } from '../../../shared/case-management';
import { TransactionContext } from '../../../shared/context/transaction-context';
import { LockService } from '../../../shared/lock/lock.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { QueueService } from '../../../shared/queue/queue.service';
import { InventoryService } from '../../inventory/services/inventory.service';
import { WARRANTY_CACHE, WARRANTY_JOBS } from '../constants/warranty.constants';
import {
  AllocateLoanDeviceDto,
  AssignTechnicianDto,
  CreateDiagnosticDto,
  CreateRepairJobDto,
  CreateTicketDto,
  PatchRepairJobDto,
  UseSparePartDto,
} from '../dto/warranty.dto';
import {
  DeviceReplacedEvent,
  LoanDeviceAllocatedEvent,
  RepairCompletedEvent,
  RepairStartedEvent,
  ServiceTicketClosedEvent,
  ServiceTicketCreatedEvent,
} from '../events/warranty.events';
import { WarrantyEventPublisher } from '../events/warranty-event.publisher';
import { WarrantyRepository } from '../repositories/warranty.repository';
import { RepairJobStore } from '../stores/repair-job.store';
import { ServiceTicketStore } from '../stores/service-ticket.store';
import { WarrantyCacheService } from './warranty-cache.service';

@Injectable()
export class ServiceOpsService implements OnModuleInit {
  private readonly logger = new Logger(ServiceOpsService.name);

  constructor(
    private readonly repo: WarrantyRepository,
    private readonly cache: WarrantyCacheService,
    private readonly locks: LockService,
    private readonly cases: CaseManager,
    private readonly ticketStore: ServiceTicketStore,
    private readonly repairStore: RepairJobStore,
    private readonly events: WarrantyEventPublisher,
    private readonly queues: QueueService,
    private readonly inventory: InventoryService,
  ) {}

  onModuleInit() {
    this.cases.registerStore('service_ticket', this.ticketStore);
    this.cases.registerStore('repair_job', this.repairStore);
  }

  listCenters() {
    return this.cache.getOrSet(WARRANTY_CACHE.centers(), async () => {
      const rows = await this.repo.client.serviceCenter.findMany({
        where: { status: 'active', deleted_at: null },
        include: { locations: { where: { deleted_at: null } } },
      });
      return rows.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        isAuthorized: c.is_authorized,
        locations: c.locations.map((l) => ({
          id: l.id,
          city: l.city,
          state: l.state,
          postalCode: l.postal_code,
          isPrimary: l.is_primary,
        })),
      }));
    });
  }

  listTechnicians(centerId: string) {
    return this.cache.getOrSet(WARRANTY_CACHE.technicians(centerId), async () => {
      const rows = await this.repo.client.technician.findMany({
        where: {
          service_center_id: centerId,
          status: 'active',
          deleted_at: null,
        },
        include: { skills: true },
      });
      return rows.map((t) => ({
        id: t.id,
        employeeCode: t.employee_code,
        displayName: t.display_name,
        isAvailable: t.is_available,
        skills: t.skills.map((s) => ({
          code: s.skill_code,
          name: s.skill_name,
        })),
      }));
    });
  }

  async listTickets(customerId?: string, asAdmin = false) {
    const rows = await this.repo.client.serviceTicket.findMany({
      where: {
        deleted_at: null,
        ...(asAdmin || !customerId ? {} : { customer_id: customerId }),
      },
      orderBy: { opened_at: 'desc' },
      take: 100,
    });
    return rows.map((t) => ({
      id: t.id,
      ticketNumber: t.ticket_number,
      title: t.title,
      status: t.status,
      priority: t.priority,
      serviceCenterId: t.service_center_id,
      technicianId: t.technician_id,
      openedAt: t.opened_at,
    }));
  }

  async createTicket(customerId: string, dto: CreateTicketDto) {
    const center = await this.repo.client.serviceCenter.findFirst({
      where: { id: dto.serviceCenterId, deleted_at: null },
    });
    if (!center) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Service center not found', 404);
    }

    const ticketNumber = `ST-${Date.now().toString(36).toUpperCase()}`;
    const ticket = await this.repo.client.serviceTicket.create({
      data: {
        ticket_number: ticketNumber,
        customer_id: customerId,
        service_center_id: dto.serviceCenterId,
        claim_id: dto.claimId,
        registration_id: dto.registrationId,
        serial_number_id: dto.serialNumberId,
        order_id: dto.orderId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? 3,
        status: 'created',
        created_by: customerId,
      },
    });

    await this.cases.recordOpened(
      { kind: 'service_ticket', id: ticket.id },
      {
        kind: 'service_ticket',
        id: ticket.id,
        number: ticket.ticket_number,
        status: 'created',
        priority: (ticket.priority as 1 | 2 | 3 | 4 | 5) ?? 3,
        openedAt: ticket.opened_at,
      },
    );

    this.events.ticketCreated(
      new ServiceTicketCreatedEvent({
        ticketId: ticket.id,
        customerId,
      }),
    );
    await this.queues.enqueue(QUEUE_NAMES.WARRANTY, WARRANTY_JOBS.TECH_ASSIGN, {
      ticketId: ticket.id,
    });
    await this.repo.audit({
      action: 'service.ticket.create',
      actorId: customerId,
      ticketId: ticket.id,
    });
    this.logger.log(
      `ticket created id=${ticket.id} corr=${TransactionContext.get()?.correlationId}`,
    );
    return {
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      status: ticket.status,
    };
  }

  async assignTechnician(actorId: string, dto: AssignTechnicianDto) {
    return this.locks.withLock(
      LockService.resourceKey('warranty', 'assign', dto.ticketId),
      async () => {
        const tech = await this.repo.client.technician.findFirst({
          where: {
            id: dto.technicianId,
            status: 'active',
            deleted_at: null,
          },
        });
        if (!tech || !tech.is_available) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            'Technician unavailable',
            409,
          );
        }

        const ticket = await this.repo.client.serviceTicket.findFirst({
          where: { id: dto.ticketId, deleted_at: null },
        });
        if (!ticket) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Ticket not found', 404);
        }

        const ref = { kind: 'service_ticket' as const, id: dto.ticketId };
        if (ticket.status === 'created') {
          await this.cases.transition(ref, 'assigned', { actorId });
        }
        const snap = await this.cases.assign(ref, dto.technicianId, actorId);

        await this.repo.audit({
          action: 'service.assign',
          actorId,
          ticketId: dto.ticketId,
          metadata: { technicianId: dto.technicianId },
        });
        await this.cache.invalidateCenters();
        return { ticketId: dto.ticketId, status: snap.status, technicianId: dto.technicianId };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async createRepairJob(actorId: string, dto: CreateRepairJobDto) {
    const ticket = await this.repo.client.serviceTicket.findFirst({
      where: { id: dto.ticketId, deleted_at: null },
    });
    if (!ticket) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Ticket not found', 404);
    }

    const repairNumber = `RJ-${Date.now().toString(36).toUpperCase()}`;
    const job = await this.repo.client.repairJob.create({
      data: {
        repair_number: repairNumber,
        ticket_id: dto.ticketId,
        technician_id: dto.technicianId ?? ticket.technician_id,
        labor_cost: dto.laborCost ?? 0,
        outcome: 'pending',
        created_by: actorId,
      },
    });

    await this.repo.client.serviceAuditLog.create({
      data: {
        repair_job_id: job.id,
        ticket_id: dto.ticketId,
        action: 'case.status',
        actor_id: actorId,
        metadata: { status: 'open' },
      },
    });

    await this.cases.recordOpened(
      { kind: 'repair_job', id: job.id },
      {
        kind: 'repair_job',
        id: job.id,
        number: job.repair_number,
        status: 'open',
        priority: 3,
        openedAt: job.created_at,
        assigneeId: job.technician_id,
      },
    );

    if (job.technician_id) {
      await this.cases.assign(
        { kind: 'repair_job', id: job.id },
        job.technician_id,
        actorId,
      );
    }

    this.events.repairStarted(
      new RepairStartedEvent({
        repairJobId: job.id,
        ticketId: dto.ticketId,
      }),
    );
    await this.queues.enqueue(QUEUE_NAMES.WARRANTY, WARRANTY_JOBS.REPAIR_NOTIFY, {
      repairJobId: job.id,
    });
    await this.repo.audit({
      action: 'repair.create',
      actorId,
      ticketId: dto.ticketId,
      repairJobId: job.id,
    });
    return {
      id: job.id,
      repairNumber: job.repair_number,
      status: 'open',
      ticketId: job.ticket_id,
    };
  }

  async getRepairJob(id: string) {
    const job = await this.repo.client.repairJob.findFirst({
      where: { id, deleted_at: null },
      include: { part_usage: true, technician: true },
    });
    if (!job) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Repair job not found', 404);
    }
    const snap = await this.cases.get({ kind: 'repair_job', id });
    const timeline = await this.cases.timeline({ kind: 'repair_job', id });
    return {
      id: job.id,
      repairNumber: job.repair_number,
      ticketId: job.ticket_id,
      status: snap.status,
      outcome: job.outcome,
      laborCost: Number(job.labor_cost),
      repairMinutes: job.repair_minutes,
      repairNotes: job.repair_notes,
      technicianId: job.technician_id,
      parts: job.part_usage.map((p) => ({
        id: p.id,
        repairPartId: p.repair_part_id,
        quantity: p.quantity,
      })),
      timeline,
    };
  }

  async patchRepairJob(actorId: string, id: string, dto: PatchRepairJobDto) {
    return this.locks.withLock(
      LockService.resourceKey('warranty', 'repair', id),
      async () => {
        const job = await this.repo.client.repairJob.findFirst({
          where: { id, deleted_at: null },
        });
        if (!job) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Repair job not found', 404);
        }

        let status = (await this.cases.get({ kind: 'repair_job', id })).status;
        if (dto.status) {
          const snap = await this.cases.transition(
            { kind: 'repair_job', id },
            dto.status,
            { actorId, reason: dto.repairNotes },
          );
          status = snap.status;
        }

        if (dto.outcome || dto.repairNotes || dto.repairMinutes != null) {
          await this.repo.client.repairJob.update({
            where: { id },
            data: {
              ...(dto.outcome ? { outcome: dto.outcome as never } : {}),
              ...(dto.repairNotes ? { repair_notes: dto.repairNotes } : {}),
              ...(dto.repairMinutes != null
                ? { repair_minutes: dto.repairMinutes }
                : {}),
              ...(dto.status === 'in_progress'
                ? { started_at: job.started_at ?? new Date() }
                : {}),
              ...(dto.status === 'resolved' || dto.status === 'closed'
                ? { completed_at: new Date() }
                : {}),
              updated_by: actorId,
            },
          });
        }

        if (dto.status === 'in_progress') {
          this.events.repairStarted(
            new RepairStartedEvent({
              repairJobId: id,
              ticketId: job.ticket_id,
            }),
          );
        }

        if (dto.status === 'resolved' || dto.status === 'closed') {
          const updated = await this.repo.client.repairJob.findFirstOrThrow({
            where: { id },
          });
          this.events.repairCompleted(
            new RepairCompletedEvent({
              repairJobId: id,
              ticketId: job.ticket_id,
              outcome: updated.outcome,
            }),
          );
        }

        await this.repo.audit({
          action: 'repair.patch',
          actorId,
          repairJobId: id,
          ticketId: job.ticket_id,
          metadata: { ...dto },
        });
        return { id, status };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async createDiagnostic(actorId: string, dto: CreateDiagnosticDto) {
    const ticket = await this.repo.client.serviceTicket.findFirst({
      where: { id: dto.ticketId, deleted_at: null },
    });
    if (!ticket) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Ticket not found', 404);
    }

    if (ticket.status === 'assigned') {
      await this.cases.transition(
        { kind: 'service_ticket', id: dto.ticketId },
        'diagnosis',
        { actorId },
      );
    }

    const report = await this.repo.client.diagnosticReport.create({
      data: {
        ticket_id: dto.ticketId,
        technician_id: ticket.technician_id,
        findings: dto.findings,
        root_cause: dto.rootCause,
        recommended_action: dto.recommendedAction,
        is_warranty_covered: dto.isWarrantyCovered ?? true,
        created_by: actorId,
      },
    });

    if (ticket.serial_number_id) {
      await this.repo.client.deviceHealthReport.create({
        data: {
          serial_number_id: ticket.serial_number_id,
          ticket_id: dto.ticketId,
          notes: [dto.findings, dto.rootCause].filter(Boolean).join('\n'),
          reported_at: new Date(),
          created_by: actorId,
        },
      });
      await this.cache.invalidateDevice(ticket.serial_number_id);
    }

    await this.repo.audit({
      action: 'service.diagnostic',
      actorId,
      ticketId: dto.ticketId,
      metadata: { reportId: report.id },
    });
    return {
      id: report.id,
      ticketId: report.ticket_id,
      findings: report.findings,
    };
  }

  async allocateLoanDevice(actorId: string, dto: AllocateLoanDeviceDto) {
    return this.locks.withLock(
      LockService.resourceKey('warranty', 'loan', dto.loanDeviceId),
      async () => {
        const device = await this.repo.client.loanDevice.findFirst({
          where: { id: dto.loanDeviceId, deleted_at: null },
        });
        if (!device || device.status !== 'available') {
          throw new AppException(
            ErrorCodes.CONFLICT,
            'Loan device unavailable',
            409,
          );
        }

        const ticket = await this.repo.client.serviceTicket.findFirst({
          where: { id: dto.ticketId, deleted_at: null },
        });
        if (!ticket) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Ticket not found', 404);
        }

        const allocation = await this.repo.client.$transaction(async (tx) => {
          await tx.loanDevice.update({
            where: { id: dto.loanDeviceId },
            data: { status: 'allocated', updated_by: actorId },
          });
          return tx.loanAllocation.create({
            data: {
              loan_device_id: dto.loanDeviceId,
              ticket_id: dto.ticketId,
              customer_id: dto.customerId ?? ticket.customer_id,
              due_back_at: dto.dueBackAt ? new Date(dto.dueBackAt) : undefined,
              status: 'active',
              created_by: actorId,
            },
          });
        });

        this.events.loanAllocated(
          new LoanDeviceAllocatedEvent({
            allocationId: allocation.id,
            loanDeviceId: dto.loanDeviceId,
            ticketId: dto.ticketId,
          }),
        );
        await this.repo.audit({
          action: 'loan.allocate',
          actorId,
          ticketId: dto.ticketId,
          metadata: { allocationId: allocation.id },
        });
        return {
          id: allocation.id,
          loanDeviceId: dto.loanDeviceId,
          status: allocation.status,
        };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async useSparePart(actorId: string, dto: UseSparePartDto) {
    return this.locks.withLock(
      LockService.resourceKey('warranty', 'parts', dto.repairJobId),
      async () => {
        const job = await this.repo.client.repairJob.findFirst({
          where: { id: dto.repairJobId, deleted_at: null },
        });
        if (!job) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Repair job not found', 404);
        }

        const part = await this.repo.client.repairPart.findFirst({
          where: { id: dto.repairPartId, deleted_at: null },
        });
        if (!part) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Spare part not found', 404);
        }

        const warehouseId = dto.warehouseId ?? part.warehouse_id;
        let reservationId: string | undefined;
        if (part.variant_id && warehouseId) {
          const reservation = await this.inventory.reserve(
            {
              warehouseId,
              variantId: part.variant_id,
              quantity: dto.quantity,
              ttlMinutes: 24 * 60,
            },
            actorId,
          );
          reservationId = reservation.id;
        }

        const usage = await this.repo.client.repairPartUsage.create({
          data: {
            repair_job_id: dto.repairJobId,
            repair_part_id: dto.repairPartId,
            warehouse_id: warehouseId,
            quantity: dto.quantity,
            unit_cost: part.unit_cost,
            is_warranty_covered: dto.isWarrantyCovered ?? false,
            created_by: actorId,
          },
        });

        await this.repo.audit({
          action: 'repair.parts.use',
          actorId,
          repairJobId: dto.repairJobId,
          ticketId: job.ticket_id,
          metadata: { usageId: usage.id, reservationId },
        });
        return {
          id: usage.id,
          reservationId,
          quantity: usage.quantity,
        };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async closeTicket(actorId: string, ticketId: string) {
    const snap = await this.cases.transition(
      { kind: 'service_ticket', id: ticketId },
      'closed',
      { actorId },
    );
    this.events.ticketClosed(new ServiceTicketClosedEvent({ ticketId }));
    await this.repo.audit({
      action: 'service.ticket.close',
      actorId,
      ticketId,
    });
    return { id: ticketId, status: snap.status };
  }

  async createReplacement(actorId: string, ticketId: string, claimId?: string) {
    const requestNumber = `REP-${Date.now().toString(36).toUpperCase()}`;
    const row = await this.repo.client.replacementRequest.create({
      data: {
        request_number: requestNumber,
        ticket_id: ticketId,
        claim_id: claimId,
        replacement_type: 'same_variant',
        created_by: actorId,
      },
    });
    this.events.deviceReplaced(
      new DeviceReplacedEvent({
        replacementRequestId: row.id,
        ticketId,
      }),
    );
    return { id: row.id, requestNumber: row.request_number };
  }

  /** No service_appointments table — surface assigned tickets as schedule slots. */
  async listAppointments(customerId?: string) {
    const rows = await this.repo.client.serviceTicket.findMany({
      where: {
        deleted_at: null,
        status: { in: ['assigned', 'diagnosis', 'repair_in_progress'] },
        ...(customerId ? { customer_id: customerId } : {}),
      },
      orderBy: { assigned_at: 'asc' },
      take: 50,
    });
    return rows.map((t) => ({
      ticketId: t.id,
      ticketNumber: t.ticket_number,
      title: t.title,
      status: t.status,
      scheduledAt: t.assigned_at ?? t.opened_at,
      technicianId: t.technician_id,
      serviceCenterId: t.service_center_id,
    }));
  }

  async dashboard() {
    const [
      openClaims,
      openTickets,
      activeRepairs,
      openRmas,
      availableLoans,
    ] = await Promise.all([
      this.repo.client.warrantyClaim.count({
        where: {
          deleted_at: null,
          status: { in: ['submitted', 'under_review', 'approved', 'in_service'] },
        },
      }),
      this.repo.client.serviceTicket.count({
        where: {
          deleted_at: null,
          status: { notIn: ['closed', 'cancelled'] },
        },
      }),
      this.repo.client.repairJob.count({
        where: {
          deleted_at: null,
          outcome: 'pending',
          completed_at: null,
        },
      }),
      this.repo.client.rmaRequest.count({
        where: {
          deleted_at: null,
          status: { in: ['requested', 'approved', 'in_transit', 'received'] },
        },
      }),
      this.repo.client.loanDevice.count({
        where: { deleted_at: null, status: 'available' },
      }),
    ]);
    return {
      openClaims,
      openTickets,
      activeRepairs,
      openRmas,
      availableLoans,
    };
  }
}
