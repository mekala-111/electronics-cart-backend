import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events/event-publisher';
import {
  GoodsReceivedEvent,
  InventoryAdjustedEvent,
  InventoryReleasedEvent,
  InventoryReservedEvent,
  LowStockDetectedEvent,
  TransferCompletedEvent,
} from './inventory.events';

@Injectable()
export class InventoryEventPublisher {
  constructor(private readonly publisher: EventPublisher) {}

  reserved(e: InventoryReservedEvent) {
    void this.publisher.publish(e);
  }
  released(e: InventoryReleasedEvent) {
    void this.publisher.publish(e);
  }
  adjusted(e: InventoryAdjustedEvent) {
    void this.publisher.publish(e);
  }
  goodsReceived(e: GoodsReceivedEvent) {
    void this.publisher.publish(e);
  }
  transferCompleted(e: TransferCompletedEvent) {
    void this.publisher.publish(e);
  }
  lowStock(e: LowStockDetectedEvent) {
    void this.publisher.publish(e);
  }
}
