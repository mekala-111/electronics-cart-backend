import type { StateMachineDefinition } from '../../../shared/state-machine/state-machine.types';

export const reverseShipmentStateMachine: StateMachineDefinition = {
  name: 'reverse_shipment',
  allowSameState: true,
  transitions: {
    requested: ['scheduled', 'cancelled'],
    scheduled: ['picked_up', 'cancelled', 'failed'],
    picked_up: ['in_transit', 'failed'],
    in_transit: ['received', 'failed'],
    received: [],
    cancelled: [],
    failed: ['requested'],
  },
};

export const rtoStateMachine: StateMachineDefinition = {
  name: 'rto',
  allowSameState: true,
  transitions: {
    initiated: ['in_transit', 'cancelled'],
    in_transit: ['received', 'cancelled'],
    received: ['closed'],
    closed: [],
    cancelled: [],
  },
};
