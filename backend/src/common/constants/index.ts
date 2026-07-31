export const APP_NAME = 'Electronics Cart API';
export const API_PREFIX = 'api';
export const CACHE_TTL = 3600;

export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
  ORDERS: 'orders',
  INVENTORY: 'inventory',
  SEARCH_INDEX: 'search-index',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
