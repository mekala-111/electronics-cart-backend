export const INVENTORY_PERMISSIONS = {
  READ: 'inventory.read',
  WRITE: 'inventory.write',
} as const;

export const INVENTORY_CACHE = {
  TTL: 60,
  PREFIX: 'inventory',
  warehouses: () => 'inventory:warehouses:list',
  warehouse: (id: string) => `inventory:warehouse:${id}`,
  stock: (warehouseId: string, variantId: string) =>
    `inventory:stock:${warehouseId}:${variantId}`,
  availability: (variantId: string) => `inventory:availability:${variantId}`,
  serial: (serial: string) => `inventory:serial:${serial}`,
} as const;

export const DEFAULT_RESERVATION_TTL_MINUTES = 30;
