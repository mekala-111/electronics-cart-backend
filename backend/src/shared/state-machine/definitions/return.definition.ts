import type { StateMachineDefinition } from '../state-machine.types';

/** Locked `ReturnStatus` graph. */
export const returnStateMachine: StateMachineDefinition = {
  name: 'return',
  allowSameState: true,
  transitions: {
    requested: ['approved', 'rejected'],
    approved: ['picked_up', 'rejected'],
    rejected: [],
    picked_up: ['received'],
    received: ['inspection'],
    inspection: ['refunded', 'completed', 'rejected'],
    refunded: ['completed'],
    completed: [],
  },
};
