export const QUEUE_NAMES = {
  EMAIL: 'email',
  DEFAULT: 'default',
  DLQ: 'dlq',
  PAYMENTS: 'payments',
  SHIPPING: 'shipping',
  WARRANTY: 'warranty',
  MARKETING: 'marketing',
  ANALYTICS: 'analytics',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
