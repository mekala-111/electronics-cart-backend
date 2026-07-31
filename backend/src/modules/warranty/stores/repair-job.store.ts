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

/**
 * RepairJob has no workflow status enum — case status lives in audit metadata;
 * outcome maps when closing.
 */
@Injectable()
export class RepairJobStore implements CaseStore {
  constructor(private readonly prisma: PrismaService) {}

  async load(ref: CaseRef): Promise<CaseSnapshot | null> {
    if (ref.kind !== 'repair_job') return null;
    const row = await this.prisma.repairJob.findFirst({
      where: { id: ref.id, deleted_at: null },
    });
    if (!row) return null;
    const status = await this.readCaseStatus(ref.id);
    const priority = 3 as CasePriority;
    const openedAt = row.started_at ?? row.created_at;
    return {
      kind: 'repair_job',
      id: row.id,
      number: row.repair_number,
      status,
      assigneeId: row.technician_id,
      priority,
      openedAt,
      dueAt: computeDueAt(openedAt, priority, CASE_DEFINITIONS.repair_job.sla),
      closedAt: row.completed_at,
      metadata: { outcome: row.outcome },
    };
  }

  async saveStatus(ref: CaseRef, status: string, actorId?: string) {
    const current = await this.load(ref);
    await this.prisma.serviceAuditLog.create({
      data: {
        repair_job_id: ref.id,
        action: 'case.status',
        actor_id: actorId,
        metadata: { status } as Prisma.InputJsonValue,
      },
    });
    const outcome =
      status === 'closed' || status === 'resolved' || status === 'completed'
        ? 'repaired'
        : status === 'cancelled'
          ? 'customer_declined'
          : undefined;
    await this.prisma.repairJob.update({
      where: { id: ref.id },
      data: {
        ...(outcome ? { outcome, completed_at: new Date() } : {}),
        ...(status === 'in_progress' || status === 'repairing'
          ? { started_at: new Date() }
          : {}),
        updated_by: actorId,
      },
    });
    await this.appendTimeline(ref, {
      at: new Date(),
      type: 'status_changed',
      actorId,
      fromStatus: current?.status,
      toStatus: status,
    });
    return (await this.load(ref))!;
  }

  async assign(ref: CaseRef, assigneeId: string, actorId?: string) {
    await this.prisma.repairJob.update({
      where: { id: ref.id },
      data: { technician_id: assigneeId, updated_by: actorId },
    });
    await this.prisma.serviceAuditLog.create({
      data: {
        repair_job_id: ref.id,
        action: 'case.status',
        actor_id: actorId,
        metadata: { status: 'assigned' } as Prisma.InputJsonValue,
      },
    });
    await this.appendTimeline(ref, {
      at: new Date(),
      type: 'assigned',
      actorId,
      message: assigneeId,
      toStatus: 'assigned',
    });
    return (await this.load(ref))!;
  }

  async setPriority(ref: CaseRef, priority: CasePriority, actorId?: string) {
    await this.appendTimeline(ref, {
      at: new Date(),
      type: 'priority_changed',
      actorId,
      metadata: { priority },
    });
    return { ...(await this.load(ref))!, priority };
  }

  async addNote(ref: CaseRef, note: CaseNoteInput) {
    const job = await this.prisma.repairJob.findFirstOrThrow({
      where: { id: ref.id },
    });
    await this.prisma.repairJob.update({
      where: { id: ref.id },
      data: {
        repair_notes: [job.repair_notes, note.body].filter(Boolean).join('\n---\n'),
      },
    });
  }

  async addAttachment(ref: CaseRef, meta: CaseAttachmentMeta, actorId?: string) {
    const job = await this.prisma.repairJob.findFirst({ where: { id: ref.id } });
    await this.prisma.serviceDocument.create({
      data: {
        ticket_id: job?.ticket_id,
        media_file_id: meta.mediaFileId,
        doc_type: meta.docType ?? 'repair',
        label: meta.label,
        created_by: actorId,
      },
    });
  }

  async appendTimeline(ref: CaseRef, entry: CaseTimelineEntry) {
    await this.prisma.serviceAuditLog.create({
      data: {
        repair_job_id: ref.id,
        action: `case.${entry.type}`,
        actor_id: entry.actorId,
        metadata: entry as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listTimeline(ref: CaseRef): Promise<CaseTimelineEntry[]> {
    const rows = await this.prisma.serviceAuditLog.findMany({
      where: { repair_job_id: ref.id, deleted_at: null },
      orderBy: { created_at: 'asc' },
    });
    return rows.map((r) => {
      const meta = (r.metadata ?? {}) as unknown as CaseTimelineEntry;
      return {
        at: r.created_at,
        type: (meta.type ?? 'status_changed') as CaseTimelineEntry['type'],
        actorId: r.actor_id ?? undefined,
        message: meta.message,
        fromStatus: meta.fromStatus,
        toStatus: meta.toStatus ?? (meta as { status?: string }).status,
      };
    });
  }

  private async readCaseStatus(jobId: string): Promise<string> {
    const last = await this.prisma.serviceAuditLog.findFirst({
      where: { repair_job_id: jobId, action: 'case.status', deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
    const status = (last?.metadata as { status?: string } | null)?.status;
    return status ?? 'open';
  }
}
