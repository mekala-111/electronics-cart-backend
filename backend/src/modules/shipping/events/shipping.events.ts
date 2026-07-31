import { DomainEvent } from '../../../shared/events/domain-event';

type ShipmentPayload = {
  shipmentId: string;
  orderId: string;
  status: string;
  trackingNumber?: string | null;
  carrier?: string;
};

export class ShipmentCreatedEvent extends DomainEvent<ShipmentPayload> {
  static readonly eventName = 'shipment.created';
  readonly eventName = ShipmentCreatedEvent.eventName;
}

export class ShipmentLabelGeneratedEvent extends DomainEvent<ShipmentPayload> {
  static readonly eventName = 'shipment.label_generated';
  readonly eventName = ShipmentLabelGeneratedEvent.eventName;
}

export class ShipmentPickupScheduledEvent extends DomainEvent<ShipmentPayload> {
  static readonly eventName = 'shipment.pickup_scheduled';
  readonly eventName = ShipmentPickupScheduledEvent.eventName;
}

export class ShipmentPickedUpEvent extends DomainEvent<ShipmentPayload> {
  static readonly eventName = 'shipment.picked_up';
  readonly eventName = ShipmentPickedUpEvent.eventName;
}

export class ShipmentInTransitEvent extends DomainEvent<ShipmentPayload> {
  static readonly eventName = 'shipment.in_transit';
  readonly eventName = ShipmentInTransitEvent.eventName;
}

export class ShipmentOutForDeliveryEvent extends DomainEvent<ShipmentPayload> {
  static readonly eventName = 'shipment.out_for_delivery';
  readonly eventName = ShipmentOutForDeliveryEvent.eventName;
}

export class ShipmentDeliveredEvent extends DomainEvent<ShipmentPayload> {
  static readonly eventName = 'shipment.delivered';
  readonly eventName = ShipmentDeliveredEvent.eventName;
}

export class ShipmentDeliveryFailedEvent extends DomainEvent<ShipmentPayload> {
  static readonly eventName = 'shipment.delivery_failed';
  readonly eventName = ShipmentDeliveryFailedEvent.eventName;
}

export class ShipmentReturnedEvent extends DomainEvent<ShipmentPayload> {
  static readonly eventName = 'shipment.returned';
  readonly eventName = ShipmentReturnedEvent.eventName;
}

export class ShipmentRtoEvent extends DomainEvent<
  ShipmentPayload & { rtoId: string }
> {
  static readonly eventName = 'shipment.rto';
  readonly eventName = ShipmentRtoEvent.eventName;
}

export class ShipmentCancelledEvent extends DomainEvent<ShipmentPayload> {
  static readonly eventName = 'shipment.cancelled';
  readonly eventName = ShipmentCancelledEvent.eventName;
}

export class CarrierWebhookReceivedEvent extends DomainEvent<{
  webhookId: string;
  carrier: string;
  eventType: string;
}> {
  static readonly eventName = 'carrier.webhook.received';
  readonly eventName = CarrierWebhookReceivedEvent.eventName;
}

export class CarrierWebhookProcessedEvent extends DomainEvent<{
  webhookId: string;
  carrier: string;
  eventType: string;
  shipmentId?: string;
}> {
  static readonly eventName = 'carrier.webhook.processed';
  readonly eventName = CarrierWebhookProcessedEvent.eventName;
}
