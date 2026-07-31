import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events/event-publisher';
import {
  CarrierWebhookProcessedEvent,
  CarrierWebhookReceivedEvent,
  ShipmentCancelledEvent,
  ShipmentCreatedEvent,
  ShipmentDeliveredEvent,
  ShipmentDeliveryFailedEvent,
  ShipmentInTransitEvent,
  ShipmentLabelGeneratedEvent,
  ShipmentOutForDeliveryEvent,
  ShipmentPickedUpEvent,
  ShipmentPickupScheduledEvent,
  ShipmentReturnedEvent,
  ShipmentRtoEvent,
} from './shipping.events';

@Injectable()
export class ShippingEventPublisher {
  constructor(private readonly publisher: EventPublisher) {}

  created(e: ShipmentCreatedEvent) {
    void this.publisher.publish(e);
  }
  labelGenerated(e: ShipmentLabelGeneratedEvent) {
    void this.publisher.publish(e);
  }
  pickupScheduled(e: ShipmentPickupScheduledEvent) {
    void this.publisher.publish(e);
  }
  pickedUp(e: ShipmentPickedUpEvent) {
    void this.publisher.publish(e);
  }
  inTransit(e: ShipmentInTransitEvent) {
    void this.publisher.publish(e);
  }
  outForDelivery(e: ShipmentOutForDeliveryEvent) {
    void this.publisher.publish(e);
  }
  delivered(e: ShipmentDeliveredEvent) {
    void this.publisher.publish(e);
  }
  deliveryFailed(e: ShipmentDeliveryFailedEvent) {
    void this.publisher.publish(e);
  }
  returned(e: ShipmentReturnedEvent) {
    void this.publisher.publish(e);
  }
  rto(e: ShipmentRtoEvent) {
    void this.publisher.publish(e);
  }
  cancelled(e: ShipmentCancelledEvent) {
    void this.publisher.publish(e);
  }
  webhookReceived(e: CarrierWebhookReceivedEvent) {
    void this.publisher.publish(e);
  }
  webhookProcessed(e: CarrierWebhookProcessedEvent) {
    void this.publisher.publish(e);
  }
}
