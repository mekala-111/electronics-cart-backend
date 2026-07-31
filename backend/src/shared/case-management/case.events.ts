import { DomainEvent } from '../events/domain-event';
import type { CaseKind, CasePriority } from './case.types';

type CasePayload = {
  kind: CaseKind;
  caseId: string;
  status: string;
  assigneeId?: string | null;
  priority?: CasePriority;
};

export class CaseOpenedEvent extends DomainEvent<CasePayload> {
  static readonly eventName = 'case.opened';
  readonly eventName = CaseOpenedEvent.eventName;
}

export class CaseStatusChangedEvent extends DomainEvent<
  CasePayload & { fromStatus: string; toStatus: string }
> {
  static readonly eventName = 'case.status_changed';
  readonly eventName = CaseStatusChangedEvent.eventName;
}

export class CaseAssignedEvent extends DomainEvent<CasePayload> {
  static readonly eventName = 'case.assigned';
  readonly eventName = CaseAssignedEvent.eventName;
}

export class CaseNoteAddedEvent extends DomainEvent<
  CasePayload & { notePreview: string }
> {
  static readonly eventName = 'case.note_added';
  readonly eventName = CaseNoteAddedEvent.eventName;
}

export class CaseEscalatedEvent extends DomainEvent<
  CasePayload & { reason: string }
> {
  static readonly eventName = 'case.escalated';
  readonly eventName = CaseEscalatedEvent.eventName;
}

export class CaseSlaBreachedEvent extends DomainEvent<
  CasePayload & { breach: 'response' | 'resolve' }
> {
  static readonly eventName = 'case.sla_breached';
  readonly eventName = CaseSlaBreachedEvent.eventName;
}

export class CaseClosedEvent extends DomainEvent<CasePayload> {
  static readonly eventName = 'case.closed';
  readonly eventName = CaseClosedEvent.eventName;
}
