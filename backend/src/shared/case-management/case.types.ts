import type { StateMachineDefinition } from '../state-machine/state-machine.types';

/** Domain case kinds Warranty/Service will bind to locked tables. */
export type CaseKind =
  | 'warranty_claim'
  | 'rma'
  | 'service_ticket'
  | 'repair_job'
  | 'support';

export type CasePriority = 1 | 2 | 3 | 4 | 5; // 1 = highest

export interface CaseRef {
  kind: CaseKind;
  id: string;
}

export interface CaseSnapshot {
  kind: CaseKind;
  id: string;
  number?: string;
  status: string;
  assigneeId?: string | null;
  priority: CasePriority;
  openedAt: Date;
  dueAt?: Date | null;
  escalatedAt?: Date | null;
  closedAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface CaseTimelineEntry {
  at: Date;
  type:
    | 'created'
    | 'status_changed'
    | 'assigned'
    | 'priority_changed'
    | 'note'
    | 'attachment'
    | 'escalated'
    | 'sla_breach'
    | 'closed';
  actorId?: string;
  message?: string;
  fromStatus?: string;
  toStatus?: string;
  metadata?: Record<string, unknown>;
}

export interface CaseNoteInput {
  body: string;
  actorId?: string;
  internal?: boolean;
}

export interface CaseAttachmentMeta {
  mediaFileId?: string;
  label?: string;
  docType?: string;
  url?: string;
}

export interface CaseSlaPolicy {
  /** Minutes to first response / assignment. */
  responseMinutes: number;
  /** Minutes to resolution from open. */
  resolveMinutes: number;
  /** Priority multiplier: due = base / multiplier (higher priority → shorter SLA). */
  priorityMultiplier?: Partial<Record<CasePriority, number>>;
}

export interface CaseEscalationRule {
  /** Escalate when unassigned past response SLA. */
  unassignedPastResponse?: boolean;
  /** Escalate when past resolve SLA and not in terminal status. */
  unresolvedPastResolve?: boolean;
  /** Escalate when priority <= this value (1 = P1). */
  maxPriority?: CasePriority;
  /** Target status on escalate (optional; otherwise only flag + event). */
  escalateToStatus?: string;
}

export interface CaseDefinition {
  kind: CaseKind;
  stateMachine: StateMachineDefinition;
  sla: CaseSlaPolicy;
  escalation?: CaseEscalationRule;
  terminalStatuses: readonly string[];
}

/**
 * Domain adapter — Warranty/Service implement against Prisma tables.
 * No shared `cases` table exists in the locked schema.
 */
export interface CaseStore {
  load(ref: CaseRef): Promise<CaseSnapshot | null>;
  saveStatus(
    ref: CaseRef,
    status: string,
    actorId?: string,
  ): Promise<CaseSnapshot>;
  assign(
    ref: CaseRef,
    assigneeId: string,
    actorId?: string,
  ): Promise<CaseSnapshot>;
  setPriority(
    ref: CaseRef,
    priority: CasePriority,
    actorId?: string,
  ): Promise<CaseSnapshot>;
  addNote(ref: CaseRef, note: CaseNoteInput): Promise<void>;
  addAttachment(ref: CaseRef, meta: CaseAttachmentMeta, actorId?: string): Promise<void>;
  appendTimeline(ref: CaseRef, entry: CaseTimelineEntry): Promise<void>;
  listTimeline?(ref: CaseRef): Promise<CaseTimelineEntry[]>;
  markEscalated?(ref: CaseRef, at: Date, actorId?: string): Promise<CaseSnapshot>;
}

export interface TransitionCaseOptions {
  actorId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  before?: () => void | Promise<void>;
  after?: (snapshot: CaseSnapshot) => void | Promise<void>;
}
