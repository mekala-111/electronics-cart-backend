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
import { computeDueAt } from '../../../shared/case-management';
import { CASE_DEFINITIONS } from '../../../shared/case-management';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class WarrantyClaimStore implements CaseStore {
  constructor(private readonly prisma: PrismaService) {}

  async load(ref: CaseRef): Promise<CaseSnapshot | null> {
    if (ref.kind !== 'warranty_claim') return null;
    const row = await this.prisma.warrantyClaim.findFirst({
      where: { id: ref.id, deleted_at: null },
    });
    if (!row) return null;
    const priority = 3 as CasePriority;
    const def = CASE_DEFINITIONS.warranty_claim;
    return {
      kind: 'warranty_claim',
      id: row.id,
      number: row.claim_number,
      status: row.status,
      assigneeId: null,
      priority,
      openedAt: row.submitted_at,
      dueAt: computeDueAt(row.submitted_at, priority, def.sla),
      closedAt: row.resolved_at,
    };
  }

  async saveStatus(ref: CaseRef, status: string, actorId?: string) {
    const current = await this.prisma.warrantyClaim.findFirstOrThrow({
      where: { id: ref.id },
    });
    const row = await this.prisma.warrantyClaim.update({
      where: { id: ref.id },
      data: {
        status: status as never,
        resolved_at: ['closed', 'rejected', 'cancelled'].includes(status)
          ? new Date()
          : current.resolved_at,
        updated_by: actorId,
      },
    });
    await this.prisma.warrantyStatusHistory.create({
      data: {
        claim_id: ref.id,
        from_status: current.status,
        to_status: status,
        actor_id: actorId,
        changed_at: new Date(),
        created_by: actorId,
      },
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
      message: `P${priority}`,
      metadata: { priority },
    });
    const snap = await this.load(ref);
    return { ...snap!, priority };
  }

  async addNote(ref: CaseRef, note: CaseNoteInput) {
    await this.prisma.warrantyStatusHistory.create({
      data: {
        claim_id: ref.id,
        from_status: null,
        to_status: (await this.load(ref))!.status,
        notes: note.body,
        actor_id: note.actorId,
        changed_at: new Date(),
        created_by: note.actorId,
      },
    });
  }

  async addAttachment(ref: CaseRef, meta: CaseAttachmentMeta, actorId?: string) {
    await this.prisma.claimDocument.create({
      data: {
        claim_id: ref.id,
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
        claim_id: ref.id,
        action: `case.${entry.type}`,
        actor_id: entry.actorId,
        metadata: entry as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listTimeline(ref: CaseRef): Promise<CaseTimelineEntry[]> {
    const rows = await this.prisma.serviceAuditLog.findMany({
      where: { claim_id: ref.id, deleted_at: null },
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
        toStatus: meta.toStatus,
        metadata: meta.metadata,
      };
    });
  }
}
