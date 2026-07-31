import { Injectable } from '@nestjs/common';
import type { CaseDefinition, CaseKind, CaseStore } from './case.types';
import { rmaStateMachine } from '../state-machine/definitions/rma.definition';
import { serviceTicketStateMachine } from '../state-machine/definitions/service-ticket.definition';
import { warrantyClaimStateMachine } from '../state-machine/definitions/warranty-claim.definition';
import { supportCaseStateMachine } from './definitions/support-case.definition';
import type { StateMachineDefinition } from '../state-machine/state-machine.types';

const DEFAULT_SLA = {
  responseMinutes: 4 * 60,
  resolveMinutes: 3 * 24 * 60,
  priorityMultiplier: { 1: 2, 2: 1.5, 3: 1, 4: 0.75, 5: 0.5 } as const,
};

export const CASE_DEFINITIONS: Record<CaseKind, CaseDefinition> = {
  warranty_claim: {
    kind: 'warranty_claim',
    stateMachine: warrantyClaimStateMachine,
    sla: { ...DEFAULT_SLA, resolveMinutes: 7 * 24 * 60 },
    escalation: {
      unassignedPastResponse: true,
      unresolvedPastResolve: true,
      maxPriority: 2,
    },
    terminalStatuses: ['closed', 'cancelled', 'rejected'],
  },
  rma: {
    kind: 'rma',
    stateMachine: rmaStateMachine,
    sla: { ...DEFAULT_SLA, resolveMinutes: 5 * 24 * 60 },
    escalation: {
      unassignedPastResponse: true,
      unresolvedPastResolve: true,
    },
    terminalStatuses: ['completed', 'rejected', 'cancelled'],
  },
  service_ticket: {
    kind: 'service_ticket',
    stateMachine: serviceTicketStateMachine,
    sla: DEFAULT_SLA,
    escalation: {
      unassignedPastResponse: true,
      unresolvedPastResolve: true,
      maxPriority: 2,
    },
    terminalStatuses: ['closed', 'cancelled'],
  },
  repair_job: {
    kind: 'repair_job',
    // RepairJob uses RepairOutcome on locked schema; track via support-like graph
    stateMachine: supportCaseStateMachine,
    sla: { ...DEFAULT_SLA, resolveMinutes: 2 * 24 * 60 },
    escalation: { unresolvedPastResolve: true },
    terminalStatuses: ['closed', 'cancelled'],
  },
  support: {
    kind: 'support',
    stateMachine: supportCaseStateMachine,
    sla: { responseMinutes: 60, resolveMinutes: 24 * 60 },
    escalation: {
      unassignedPastResponse: true,
      unresolvedPastResolve: true,
      maxPriority: 2,
      escalateToStatus: 'escalated',
    },
    terminalStatuses: ['closed', 'cancelled'],
  },
};

@Injectable()
export class CaseRegistry {
  private readonly stores = new Map<CaseKind, CaseStore>();

  registerStore(kind: CaseKind, store: CaseStore): void {
    this.stores.set(kind, store);
  }

  getStore(kind: CaseKind): CaseStore {
    const store = this.stores.get(kind);
    if (!store) {
      throw new Error(`No CaseStore registered for kind=${kind}`);
    }
    return store;
  }

  getDefinition(kind: CaseKind): CaseDefinition {
    return CASE_DEFINITIONS[kind];
  }

  getStateMachine(kind: CaseKind): StateMachineDefinition {
    return CASE_DEFINITIONS[kind].stateMachine;
  }

  hasStore(kind: CaseKind): boolean {
    return this.stores.has(kind);
  }
}
