import type { StateMachineDefinition } from '../state-machine.types';

/** Locked `RmaStatus` graph. */
export const rmaStateMachine: StateMachineDefinition = {
  name: 'rma',
  allowSameState: true,
  transitions: {
    requested: ['approved', 'rejected', 'cancelled'],
    approved: ['in_transit', 'cancelled'],
    in_transit: ['received', 'cancelled'],
    received: ['completed', 'rejected'],
    completed: [],
    rejected: [],
    cancelled: [],
  },
};
