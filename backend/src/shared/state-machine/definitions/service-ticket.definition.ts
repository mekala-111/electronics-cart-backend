import type { StateMachineDefinition } from '../state-machine.types';

/** Locked `ServiceTicketStatus` graph. */
export const serviceTicketStateMachine: StateMachineDefinition = {
  name: 'service_ticket',
  allowSameState: true,
  transitions: {
    created: ['assigned', 'cancelled'],
    assigned: ['diagnosis', 'cancelled'],
    diagnosis: ['waiting_for_parts', 'repair_in_progress', 'cancelled'],
    waiting_for_parts: ['repair_in_progress', 'cancelled'],
    repair_in_progress: ['testing', 'cancelled'],
    testing: ['quality_check', 'repair_in_progress', 'cancelled'],
    quality_check: ['ready_for_pickup', 'repair_in_progress', 'cancelled'],
    ready_for_pickup: ['delivered', 'cancelled'],
    delivered: ['closed'],
    closed: [],
    cancelled: [],
  },
};
