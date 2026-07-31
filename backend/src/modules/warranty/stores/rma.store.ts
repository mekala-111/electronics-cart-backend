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
export class RmaStore implements CaseStore {
  constructor(private readonly prisma: PrismaService) {}

  async load(ref: CaseRef): Promise<CaseSnapshot | null> {
    if (ref.kind !== 'rma') return null;
    const row = await this.prisma.rmaRequest.findFirst({
      where: { id: ref.id, deleted_at: null },
    });
    if (!row) return null;
    const priority = 3 as CasePriority;
    return {
      kind: 'rma',
      id: row.id,
      number: row.rma_number,
      status: row.status,
      assigneeId: null,
      priority,
      openedAt: row.requested_at,
      dueAt: computeDueAt(row.requested_at, priority, CASE_DEFINITIONS.rma.sla),
      closedAt: row.completed_at,
    };
  }

  async saveStatus(ref: CaseRef, status: string, actorId?: string) {
    const current = await this.prisma.rmaRequest.findFirstOrThrow({
      where: { id: ref.id },
    });
    await this.prisma.rmaRequest.update({
      where: { id: ref.id },
      data: {
        status: status as never,
        completed_at: ['completed', 'rejected', 'cancelled'].includes(status)
          ? new Date()
          : current.completed_at,
        updated_by: actorId,
      },
    });
    await this.appendTimeline(ref, {
      at: new Date(),
      type: 'status_changed',
      actorId,
      fromStatus: current.status,
      toStatus: status,
    });
    return (await this.load(ref))!;
  }

  async assign(ref: CaseRef, assigneeId: string, actorId?: string) {
    await this.appendTimeline(ref, {
      at: new Date(),
      type: 'assigned',
      actorId,
      message: `Assigned ${assigneeId}`,
      metadata: { assigneeId },
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
    await this.prisma.serviceAuditLog.create({
      data: {
        action: 'rma.note',
        actor_id: note.actorId,
        metadata: { rmaId: ref.id, body: note.body } as Prisma.InputJsonValue,
      },
    });
  }

  async addAttachment(ref: CaseRef, meta: CaseAttachmentMeta, actorId?: string) {
    await this.prisma.serviceDocument.create({
      data: {
        media_file_id: meta.mediaFileId,
        doc_type: meta.docType ?? 'rma',
        label: meta.label ?? `RMA ${ref.id}`,
        created_by: actorId,
      },
    });
  }

  async appendTimeline(ref: CaseRef, entry: CaseTimelineEntry) {
    await this.prisma.serviceAuditLog.create({
      data: {
        action: `case.${entry.type}`,
        actor_id: entry.actorId,
        metadata: { ...entry, rmaId: ref.id } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listTimeline(ref: CaseRef): Promise<CaseTimelineEntry[]> {
    const rows = await this.prisma.serviceAuditLog.findMany({
      where: {
        deleted_at: null,
        action: { startsWith: 'case.' },
      },
      orderBy: { created_at: 'asc' },
      take: 200,
    });
    return rows
      .filter((r) => (r.metadata as { rmaId?: string } | null)?.rmaId === ref.id)
      .map((r) => {
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
  }
}
