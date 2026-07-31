import { DomainEvent } from '../../../shared/events/domain-event';

export class InventoryReservedEvent extends DomainEvent<{
  reservationId: string;
  warehouseId: string;
  variantId: string;
  quantity: number;
}> {
  static readonly eventName = 'inventory.reserved';
  readonly eventName = InventoryReservedEvent.eventName;
}

export class InventoryReleasedEvent extends DomainEvent<{
  reservationId: string;
  warehouseId: string;
  variantId: string;
  quantity: number;
}> {
  static readonly eventName = 'inventory.released';
  readonly eventName = InventoryReleasedEvent.eventName;
}

export class InventoryAdjustedEvent extends DomainEvent<{
  adjustmentId: string;
  warehouseId: string;
  variantId: string;
  quantityDelta: number;
  reason: string;
}> {
  static readonly eventName = 'inventory.adjusted';
  readonly eventName = InventoryAdjustedEvent.eventName;
}

export class GoodsReceivedEvent extends DomainEvent<{
  goodsReceiptId: string;
  grnNumber: string;
  warehouseId: string;
}> {
  static readonly eventName = 'inventory.goods_received';
  readonly eventName = GoodsReceivedEvent.eventName;
}

export class TransferCompletedEvent extends DomainEvent<{
  transferId: string;
  transferNumber: string;
  fromWarehouseId: string;
  toWarehouseId: string;
}> {
  static readonly eventName = 'inventory.transfer_completed';
  readonly eventName = TransferCompletedEvent.eventName;
}

export class LowStockDetectedEvent extends DomainEvent<{
  alertId: string;
  warehouseId: string;
  variantId: string;
  available: number;
  reorderLevel: number;
}> {
  static readonly eventName = 'inventory.low_stock_detected';
  readonly eventName = LowStockDetectedEvent.eventName;
}
