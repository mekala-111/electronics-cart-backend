export const SHIPPING_PERMISSIONS = {
  READ: 'shipping.read',
  WRITE: 'shipping.write',
} as const;

export const SHIPROCKET_PARTNER_ID = '70000000-0000-0000-0000-000000000001';

export const SHIPPING_CACHE = {
  TTL: 60,
  methods: () => 'shipping:methods:list',
  rates: (key: string) => `shipping:rates:${key}`,
  shipment: (id: string) => `shipping:shipment:${id}`,
  tracking: (id: string) => `shipping:tracking:${id}`,
  partner: (code: string) => `shipping:partner:${code}`,
  slots: () => 'shipping:slots:list',
  pickupPoints: () => 'shipping:pickup-points:list',
} as const;

export const SHIPPING_JOBS = {
  WEBHOOK: 'shipping.webhook.process',
  TRACKING_SYNC: 'shipping.tracking.sync',
  ETA_REFRESH: 'shipping.eta.refresh',
  PICKUP_SCHEDULER: 'shipping.pickup.scheduler',
  CARRIER_RETRY: 'shipping.carrier.retry',
  NOTIFY: 'shipping.notify',
} as const;

/**
 * Conceptual flow → locked ShipmentStatus:
 * label_generated → packed
 * pickup_scheduled / picked_up → dispatched
 */
export const SHIPMENT_STATUS = {
  CREATED: 'created',
  PACKED: 'packed',
  DISPATCHED: 'dispatched',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  DELIVERY_FAILED: 'delivery_failed',
  RETURNED: 'returned',
  LOST: 'lost',
  DAMAGED: 'damaged',
  CANCELLED: 'cancelled',
} as const;
