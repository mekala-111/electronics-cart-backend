import type { StateMachineDefinition } from '../../state-machine/state-machine.types';

/**
 * Generic support / repair case graph (no dedicated support_cases table).
 * Domains may map statuses onto their own enums when adapting.
 */
export const supportCaseStateMachine: StateMachineDefinition = {
  name: 'support_case',
  allowSameState: true,
  transitions: {
    open: ['assigned', 'escalated', 'cancelled'],
    assigned: ['in_progress', 'escalated', 'cancelled', 'on_hold'],
    in_progress: ['on_hold', 'resolved', 'escalated', 'cancelled'],
    on_hold: ['in_progress', 'escalated', 'cancelled'],
    escalated: ['assigned', 'in_progress', 'resolved', 'cancelled'],
    resolved: ['closed', 'in_progress'],
    closed: [],
    cancelled: [],
  },
};
