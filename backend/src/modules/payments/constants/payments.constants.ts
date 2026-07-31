export const PAYMENTS_PERMISSIONS = {
  READ: 'payments.read',
  WRITE: 'payments.write',
} as const;

export const RAZORPAY_GATEWAY_ID = '60000000-0000-0000-0000-000000000001';

export const PAYMENTS_CACHE = {
  TTL: 60,
  PREFIX: 'payments',
  status: (id: string) => `payments:status:${id}`,
  methods: () => 'payments:methods:list',
  gateway: (code: string) => `payments:gateway:${code}`,
  saved: (customerId: string) => `payments:saved:${customerId}`,
  order: (orderId: string) => `payments:order:${orderId}`,
} as const;

export const PAYMENT_JOBS = {
  WEBHOOK: 'payment.webhook.process',
  SETTLEMENT_SYNC: 'payment.settlement.sync',
  REFUND: 'payment.refund.process',
  RETRY: 'payment.retry',
  RECEIPT_EMAIL: 'payment.receipt.email',
} as const;

/** Schema has no `created` — API "created" maps to DB `pending`. */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  CHARGEBACK: 'chargeback',
} as const;
