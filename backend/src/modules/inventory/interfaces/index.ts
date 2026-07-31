export interface StockAvailability {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  variantId: string;
  available: number;
  reserved: number;
  damaged: number;
  inTransit: number;
}

export interface ReserveStockInput {
  warehouseId: string;
  variantId: string;
  quantity: number;
  cartId?: string;
  orderId?: string;
  sessionKey?: string;
  ttlMinutes?: number;
  actorId?: string;
}
