import type { StateMachineDefinition } from '../state-machine.types';

/** Locked `WarrantyClaimStatus` graph. */
export const warrantyClaimStateMachine: StateMachineDefinition = {
  name: 'warranty_claim',
  allowSameState: true,
  transitions: {
    submitted: ['under_review', 'cancelled'],
    under_review: ['approved', 'rejected', 'cancelled'],
    approved: ['in_service', 'cancelled'],
    rejected: [],
    in_service: ['closed', 'cancelled'],
    closed: [],
    cancelled: [],
  },
};
