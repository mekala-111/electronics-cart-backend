export const ORDERS_PERMISSIONS = {
  READ: 'orders.read',
  WRITE: 'orders.write',
} as const;

export const ORDERS_CACHE = {
  TTL: 60,
  cart: (key: string) => `orders:cart:${key}`,
  order: (id: string) => `orders:order:${id}`,
  recent: (userId: string) => `orders:recent:${userId}`,
} as const;

export const ALLOWED_CANCEL_FROM = new Set(['pending', 'confirmed']);
export const ALLOWED_RETURN_FROM = new Set(['delivered', 'completed', 'shipped']);
