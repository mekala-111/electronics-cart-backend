import type { StateMachineDefinition } from '../state-machine.types';

/** Locked `ShipmentStatus` graph for the future Shipping module. */
export const shipmentStateMachine: StateMachineDefinition = {
  name: 'shipment',
  allowSameState: true,
  transitions: {
    created: ['packed', 'cancelled'],
    packed: ['dispatched', 'cancelled'],
    dispatched: ['in_transit', 'cancelled', 'lost', 'damaged'],
    in_transit: [
      'out_for_delivery',
      'delivered',
      'delivery_failed',
      'returned',
      'lost',
      'damaged',
      'cancelled',
    ],
    out_for_delivery: [
      'delivered',
      'delivery_failed',
      'returned',
      'lost',
      'damaged',
    ],
    delivered: [],
    delivery_failed: ['out_for_delivery', 'returned', 'cancelled'],
    returned: [],
    lost: [],
    damaged: [],
    cancelled: [],
  },
};
