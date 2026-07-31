import { Injectable } from '@nestjs/common';
import type {
  CaseAttachmentMeta,
  CaseKind,
  CaseNoteInput,
  CasePriority,
  CaseRef,
  CaseSnapshot,
  CaseStore,
  CaseTimelineEntry,
} from './case.types';
import { computeDueAt } from './case-sla';
import { CASE_DEFINITIONS } from './case.registry';

/**
 * In-memory store for `support` cases and tests.
 * # ponytail: RAM only; Warranty/Service bind Prisma CaseStore adapters.
 */
@Injectable()
export class InMemoryCaseStore implements CaseStore {
  private readonly cases = new Map<string, CaseSnapshot>();
  private readonly timelines = new Map<string, CaseTimelineEntry[]>();
  private readonly notes = new Map<string, CaseNoteInput[]>();
  private readonly attachments = new Map<string, CaseAttachmentMeta[]>();

  key(ref: CaseRef): string {
    return `${ref.kind}:${ref.id}`;
  }

  open(
    kind: CaseKind,
    id: string,
    opts?: {
      number?: string;
      priority?: CasePriority;
      status?: string;
      assigneeId?: string;
      metadata?: Record<string, unknown>;
    },
  ): CaseSnapshot {
    const def = CASE_DEFINITIONS[kind];
    const priority = opts?.priority ?? 3;
    const openedAt = new Date();
    const snap: CaseSnapshot = {
      kind,
      id,
      number: opts?.number,
      status: opts?.status ?? Object.keys(def.stateMachine.transitions)[0]!,
      assigneeId: opts?.assigneeId,
      priority,
      openedAt,
      dueAt: computeDueAt(openedAt, priority, def.sla),
      metadata: opts?.metadata,
    };
    this.cases.set(this.key({ kind, id }), snap);
    this.timelines.set(this.key({ kind, id }), [
      {
        at: openedAt,
        type: 'created',
        message: 'Case opened',
        toStatus: snap.status,
      },
    ]);
    return snap;
  }

  async load(ref: CaseRef): Promise<CaseSnapshot | null> {
    return this.cases.get(this.key(ref)) ?? null;
  }

  async saveStatus(
    ref: CaseRef,
    status: string,
    _actorId?: string,
  ): Promise<CaseSnapshot> {
    const snap = await this.require(ref);
    const next = {
      ...snap,
      status,
      closedAt: CASE_DEFINITIONS[ref.kind].terminalStatuses.includes(status)
        ? new Date()
        : snap.closedAt,
    };
    this.cases.set(this.key(ref), next);
    return next;
  }

  async assign(
    ref: CaseRef,
    assigneeId: string,
    _actorId?: string,
  ): Promise<CaseSnapshot> {
    const snap = await this.require(ref);
    const next = { ...snap, assigneeId };
    this.cases.set(this.key(ref), next);
    return next;
  }

  async setPriority(
    ref: CaseRef,
    priority: CasePriority,
    _actorId?: string,
  ): Promise<CaseSnapshot> {
    const snap = await this.require(ref);
    const def = CASE_DEFINITIONS[ref.kind];
    const next = {
      ...snap,
      priority,
      dueAt: computeDueAt(snap.openedAt, priority, def.sla),
    };
    this.cases.set(this.key(ref), next);
    return next;
  }

  async addNote(ref: CaseRef, note: CaseNoteInput): Promise<void> {
    const k = this.key(ref);
    const list = this.notes.get(k) ?? [];
    list.push(note);
    this.notes.set(k, list);
  }

  async addAttachment(
    ref: CaseRef,
    meta: CaseAttachmentMeta,
  ): Promise<void> {
    const k = this.key(ref);
    const list = this.attachments.get(k) ?? [];
    list.push(meta);
    this.attachments.set(k, list);
  }

  async appendTimeline(ref: CaseRef, entry: CaseTimelineEntry): Promise<void> {
    const k = this.key(ref);
    const list = this.timelines.get(k) ?? [];
    list.push(entry);
    this.timelines.set(k, list);
  }

  async listTimeline(ref: CaseRef): Promise<CaseTimelineEntry[]> {
    return [...(this.timelines.get(this.key(ref)) ?? [])];
  }

  async markEscalated(ref: CaseRef, at: Date): Promise<CaseSnapshot> {
    const snap = await this.require(ref);
    const next = { ...snap, escalatedAt: at };
    this.cases.set(this.key(ref), next);
    return next;
  }

  private async require(ref: CaseRef): Promise<CaseSnapshot> {
    const snap = await this.load(ref);
    if (!snap) throw new Error(`Case not found ${ref.kind}:${ref.id}`);
    return snap;
  }
}
