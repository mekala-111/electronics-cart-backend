import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CaseAttachmentMeta,
  CaseNoteInput,
  CasePriority,
  CaseRef,
  CaseSnapshot,
  CaseStore,
  CaseTimelineEntry,
} from '../../../shared/case-management';
import { CASE_DEFINITIONS, computeDueAt } from '../../../shared/case-management';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ServiceTicketStore implements CaseStore {
  constructor(private readonly prisma: PrismaService) {}

  async load(ref: CaseRef): Promise<CaseSnapshot | null> {
    if (ref.kind !== 'service_ticket') return null;
    const row = await this.prisma.serviceTicket.findFirst({
      where: { id: ref.id, deleted_at: null },
      include: { service_sla: true },
    });
    if (!row) return null;
    const priority = clampPriority(row.priority);
    const def = CASE_DEFINITIONS.service_ticket;
    const sla = row.service_sla
      ? {
          responseMinutes: row.service_sla.response_time_minutes,
          resolveMinutes: row.service_sla.resolution_time_minutes,
        }
      : def.sla;
    return {
      kind: 'service_ticket',
      id: row.id,
      number: row.ticket_number,
      status: row.status,
      assigneeId: row.technician_id,
      priority,
      openedAt: row.opened_at,
      dueAt: computeDueAt(row.opened_at, priority, { ...def.sla, ...sla }),
      closedAt: row.closed_at,
    };
  }

  async saveStatus(ref: CaseRef, status: string, actorId?: string) {
    const current = await this.prisma.serviceTicket.findFirstOrThrow({
      where: { id: ref.id },
    });
    await this.prisma.serviceTicket.update({
      where: { id: ref.id },
      data: {
        status: status as never,
        closed_at: ['closed', 'cancelled'].includes(status)
          ? new Date()
          : current.closed_at,
        updated_by: actorId,
      },
    });
    await this.prisma.ticketStatusHistory.create({
      data: {
        ticket_id: ref.id,
        from_status: current.status,
        to_status: status as never,
        changed_at: new Date(),
        actor_id: actorId,
        created_by: actorId,
      },
    });
    return (await this.load(ref))!;
  }

  async assign(ref: CaseRef, assigneeId: string, actorId?: string) {
    await this.prisma.serviceTicket.update({
      where: { id: ref.id },
      data: {
        technician_id: assigneeId,
        assigned_at: new Date(),
        status: 'assigned',
        updated_by: actorId,
      },
    });
    await this.appendTimeline(ref, {
      at: new Date(),
      type: 'assigned',
      actorId,
      message: `Technician ${assigneeId}`,
      toStatus: 'assigned',
    });
    return (await this.load(ref))!;
  }

  async setPriority(ref: CaseRef, priority: CasePriority, actorId?: string) {
    await this.prisma.serviceTicket.update({
      where: { id: ref.id },
      data: { priority, updated_by: actorId },
    });
    await this.appendTimeline(ref, {
      at: new Date(),
      type: 'priority_changed',
      actorId,
      metadata: { priority },
    });
    return (await this.load(ref))!;
  }

  async addNote(ref: CaseRef, note: CaseNoteInput) {
    await this.prisma.ticketStatusHistory.create({
      data: {
        ticket_id: ref.id,
        from_status: null,
        to_status: (await this.load(ref))!.status as never,
        notes: note.body,
        actor_id: note.actorId,
        changed_at: new Date(),
        created_by: note.actorId,
      },
    });
  }

  async addAttachment(ref: CaseRef, meta: CaseAttachmentMeta, actorId?: string) {
    await this.prisma.serviceDocument.create({
      data: {
        ticket_id: ref.id,
        media_file_id: meta.mediaFileId,
        doc_type: meta.docType ?? 'other',
        label: meta.label,
        created_by: actorId,
      },
    });
  }

  async appendTimeline(ref: CaseRef, entry: CaseTimelineEntry) {
    await this.prisma.serviceAuditLog.create({
      data: {
        ticket_id: ref.id,
        action: `case.${entry.type}`,
        actor_id: entry.actorId,
        metadata: entry as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listTimeline(ref: CaseRef): Promise<CaseTimelineEntry[]> {
    const [audits, history] = await Promise.all([
      this.prisma.serviceAuditLog.findMany({
        where: { ticket_id: ref.id, deleted_at: null },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.ticketStatusHistory.findMany({
        where: { ticket_id: ref.id, deleted_at: null },
        orderBy: { changed_at: 'asc' },
      }),
    ]);
    const fromHistory: CaseTimelineEntry[] = history.map((h) => ({
      at: h.changed_at,
      type: h.notes && !h.from_status ? 'note' : 'status_changed',
      actorId: h.actor_id ?? undefined,
      message: h.notes ?? undefined,
      fromStatus: h.from_status ?? undefined,
      toStatus: h.to_status,
    }));
    const fromAudit: CaseTimelineEntry[] = audits.map((r) => {
      const meta = (r.metadata ?? {}) as unknown as CaseTimelineEntry;
      return {
        at: r.created_at,
        type: (meta.type ?? 'status_changed') as CaseTimelineEntry['type'],
        actorId: r.actor_id ?? undefined,
        message: meta.message,
        fromStatus: meta.fromStatus,
        toStatus: meta.toStatus,
      };
    });
    return [...fromHistory, ...fromAudit].sort(
      (a, b) => a.at.getTime() - b.at.getTime(),
    );
  }
}

function clampPriority(p: number): CasePriority {
  if (p <= 1) return 1;
  if (p >= 5) return 5;
  return p as CasePriority;
}
