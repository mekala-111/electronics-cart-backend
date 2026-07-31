import { Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../core/errors/app.exception';
import { ErrorCodes } from '../../core/errors/error-codes';
import { TransactionContext } from '../context/transaction-context';
import { EventPublisher } from '../events/event-publisher';
import { StateMachineEngine } from '../state-machine/state-machine.engine';
import {
  CaseAssignedEvent,
  CaseClosedEvent,
  CaseEscalatedEvent,
  CaseNoteAddedEvent,
  CaseOpenedEvent,
  CaseSlaBreachedEvent,
  CaseStatusChangedEvent,
} from './case.events';
import { CaseRegistry } from './case.registry';
import {
  computeDueAt,
  isResolveBreached,
  isResponseBreached,
} from './case-sla';
import { InMemoryCaseStore } from './memory-case.store';
import type {
  CaseAttachmentMeta,
  CaseKind,
  CaseNoteInput,
  CasePriority,
  CaseRef,
  CaseSnapshot,
  TransitionCaseOptions,
} from './case.types';

@Injectable()
export class CaseManager {
  private readonly logger = new Logger(CaseManager.name);

  constructor(
    private readonly registry: CaseRegistry,
    private readonly stateMachine: StateMachineEngine,
    private readonly events: EventPublisher,
    private readonly memory: InMemoryCaseStore,
  ) {
    // Default support store — other kinds register Prisma adapters in Warranty module
    this.registry.registerStore('support', this.memory);
    this.registry.registerStore('repair_job', this.memory);
  }

  /** Open an in-memory support/repair case (no shared cases table). */
  openSupportCase(input: {
    id?: string;
    number?: string;
    priority?: CasePriority;
    assigneeId?: string;
    metadata?: Record<string, unknown>;
    actorId?: string;
  }): CaseSnapshot {
    const id = input.id ?? cryptoRandom();
    const snap = this.memory.open('support', id, {
      number: input.number,
      priority: input.priority,
      assigneeId: input.assigneeId,
      metadata: input.metadata,
      status: 'open',
    });
    this.events.publishFireAndForget(
      new CaseOpenedEvent({
        kind: 'support',
        caseId: snap.id,
        status: snap.status,
        assigneeId: snap.assigneeId,
        priority: snap.priority,
      }),
    );
    this.logger.log(
      `case opened kind=support id=${snap.id} corr=${TransactionContext.get()?.correlationId}`,
    );
    return snap;
  }

  async get(ref: CaseRef): Promise<CaseSnapshot> {
    const snap = await this.store(ref.kind).load(ref);
    if (!snap) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Case not found', 404);
    }
    return snap;
  }

  async transition(
    ref: CaseRef,
    to: string,
    options: TransitionCaseOptions = {},
  ): Promise<CaseSnapshot> {
    const def = this.registry.getDefinition(ref.kind);
    const store = this.store(ref.kind);
    const current = await this.require(ref);

    const result = await this.stateMachine.transition(def.stateMachine, {
      entityId: ref.id,
      from: current.status,
      to,
      actorId: options.actorId,
      reason: options.reason,
      metadata: { kind: ref.kind, ...options.metadata },
      before: options.before,
      apply: async () => store.saveStatus(ref, to, options.actorId),
      audit: async (ctx) => {
        await store.appendTimeline(ref, {
          at: new Date(),
          type: 'status_changed',
          actorId: options.actorId,
          fromStatus: ctx.from,
          toStatus: ctx.to,
          message: options.reason,
        });
      },
    });

    const snap = (result.result as CaseSnapshot) ?? (await this.require(ref));

    this.events.publishFireAndForget(
      new CaseStatusChangedEvent({
        kind: ref.kind,
        caseId: ref.id,
        status: snap.status,
        fromStatus: current.status,
        toStatus: to,
        assigneeId: snap.assigneeId,
        priority: snap.priority,
      }),
    );

    if (def.terminalStatuses.includes(to)) {
      this.events.publishFireAndForget(
        new CaseClosedEvent({
          kind: ref.kind,
          caseId: ref.id,
          status: to,
          assigneeId: snap.assigneeId,
          priority: snap.priority,
        }),
      );
    }

    if (options.after) await options.after(snap);
    return snap;
  }

  async assign(
    ref: CaseRef,
    assigneeId: string,
    actorId?: string,
  ): Promise<CaseSnapshot> {
    const store = this.store(ref.kind);
    const snap = await store.assign(ref, assigneeId, actorId);
    await store.appendTimeline(ref, {
      at: new Date(),
      type: 'assigned',
      actorId,
      message: `Assigned to ${assigneeId}`,
    });
    this.events.publishFireAndForget(
      new CaseAssignedEvent({
        kind: ref.kind,
        caseId: ref.id,
        status: snap.status,
        assigneeId,
        priority: snap.priority,
      }),
    );
    return snap;
  }

  async setPriority(
    ref: CaseRef,
    priority: CasePriority,
    actorId?: string,
  ): Promise<CaseSnapshot> {
    const store = this.store(ref.kind);
    const snap = await store.setPriority(ref, priority, actorId);
    await store.appendTimeline(ref, {
      at: new Date(),
      type: 'priority_changed',
      actorId,
      message: `Priority → P${priority}`,
      metadata: { dueAt: snap.dueAt },
    });
    return snap;
  }

  async addNote(ref: CaseRef, note: CaseNoteInput): Promise<void> {
    const store = this.store(ref.kind);
    await this.require(ref);
    await store.addNote(ref, note);
    await store.appendTimeline(ref, {
      at: new Date(),
      type: 'note',
      actorId: note.actorId,
      message: note.body.slice(0, 280),
      metadata: { internal: note.internal ?? false },
    });
    this.events.publishFireAndForget(
      new CaseNoteAddedEvent({
        kind: ref.kind,
        caseId: ref.id,
        status: (await store.load(ref))!.status,
        notePreview: note.body.slice(0, 120),
      }),
    );
  }

  async addAttachment(
    ref: CaseRef,
    meta: CaseAttachmentMeta,
    actorId?: string,
  ): Promise<void> {
    const store = this.store(ref.kind);
    await this.require(ref);
    await store.addAttachment(ref, meta, actorId);
    await store.appendTimeline(ref, {
      at: new Date(),
      type: 'attachment',
      actorId,
      message: meta.label ?? meta.docType ?? 'attachment',
      metadata: { ...meta },
    });
  }

  async timeline(ref: CaseRef) {
    const store = this.store(ref.kind);
    await this.require(ref);
    if (store.listTimeline) return store.listTimeline(ref);
    return [];
  }

  /**
   * Evaluate SLA + escalation rules. Emits breach/escalation events.
   * Optionally transitions to escalateToStatus when configured.
   */
  async evaluateSla(
    ref: CaseRef,
    opts?: { actorId?: string; now?: Date; autoEscalate?: boolean },
  ): Promise<{
    responseBreached: boolean;
    resolveBreached: boolean;
    escalated: boolean;
    snapshot: CaseSnapshot;
  }> {
    const def = this.registry.getDefinition(ref.kind);
    const store = this.store(ref.kind);
    let snap = await this.require(ref);
    const now = opts?.now ?? new Date();

    const responseBreached = isResponseBreached(snap, def.sla, now);
    const resolveBreached = isResolveBreached(
      snap,
      def.sla,
      def.terminalStatuses,
      now,
    );

    if (responseBreached) {
      this.events.publishFireAndForget(
        new CaseSlaBreachedEvent({
          kind: ref.kind,
          caseId: ref.id,
          status: snap.status,
          breach: 'response',
          priority: snap.priority,
        }),
      );
    }
    if (resolveBreached) {
      this.events.publishFireAndForget(
        new CaseSlaBreachedEvent({
          kind: ref.kind,
          caseId: ref.id,
          status: snap.status,
          breach: 'resolve',
          priority: snap.priority,
        }),
      );
    }

    let escalated = false;
    const rules = def.escalation;
    const shouldEscalate =
      !!rules &&
      ((rules.unassignedPastResponse && responseBreached) ||
        (rules.unresolvedPastResolve && resolveBreached) ||
        (rules.maxPriority != null && snap.priority <= rules.maxPriority && !snap.assigneeId));

    if (shouldEscalate && !snap.escalatedAt) {
      const reason = responseBreached
        ? 'response_sla'
        : resolveBreached
          ? 'resolve_sla'
          : 'priority_unassigned';

      if (store.markEscalated) {
        snap = await store.markEscalated(ref, now, opts?.actorId);
      } else {
        snap = { ...snap, escalatedAt: now };
      }

      await store.appendTimeline(ref, {
        at: now,
        type: 'escalated',
        actorId: opts?.actorId,
        message: reason,
      });

      this.events.publishFireAndForget(
        new CaseEscalatedEvent({
          kind: ref.kind,
          caseId: ref.id,
          status: snap.status,
          reason,
          priority: snap.priority,
          assigneeId: snap.assigneeId,
        }),
      );

      if (
        opts?.autoEscalate !== false &&
        rules?.escalateToStatus &&
        this.stateMachine.canTransition(
          def.stateMachine,
          snap.status,
          rules.escalateToStatus,
        )
      ) {
        snap = await this.transition(ref, rules.escalateToStatus, {
          actorId: opts?.actorId,
          reason: `Escalation: ${reason}`,
        });
      }

      escalated = true;
    }

    return { responseBreached, resolveBreached, escalated, snapshot: snap };
  }

  /** Helper for domain modules opening cases against their store. */
  async recordOpened(ref: CaseRef, snap: CaseSnapshot): Promise<void> {
    const store = this.store(ref.kind);
    await store.appendTimeline(ref, {
      at: snap.openedAt,
      type: 'created',
      toStatus: snap.status,
      message: 'Case opened',
    });
    if (!snap.dueAt) {
      const def = this.registry.getDefinition(ref.kind);
      snap.dueAt = computeDueAt(snap.openedAt, snap.priority, def.sla);
    }
    this.events.publishFireAndForget(
      new CaseOpenedEvent({
        kind: ref.kind,
        caseId: ref.id,
        status: snap.status,
        assigneeId: snap.assigneeId,
        priority: snap.priority,
      }),
    );
  }

  registerStore(kind: CaseKind, store: Parameters<CaseRegistry['registerStore']>[1]) {
    this.registry.registerStore(kind, store);
  }

  private store(kind: CaseKind) {
    return this.registry.getStore(kind);
  }

  private async require(ref: CaseRef): Promise<CaseSnapshot> {
    const snap = await this.store(ref.kind).load(ref);
    if (!snap) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Case not found', 404);
    }
    return snap;
  }
}

function cryptoRandom(): string {
  return `case_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
