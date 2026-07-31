import { Shipment, ShippingService, PickupPoint, DeliverySlot } from '@prisma/client';

export function mapShipment(
  s: Shipment & { partner?: { code: string; name: string } | null },
) {
  return {
    id: s.id,
    shipmentNumber: s.shipment_number,
    orderId: s.order_id,
    warehouseId: s.warehouse_id,
    partnerId: s.partner_id,
    partnerCode: s.partner?.code,
    serviceId: s.service_id,
    status: s.status,
    trackingNumber: s.tracking_number,
    awbNumber: s.awb_number,
    shippingCharge: Number(s.shipping_charge),
    currency: s.currency,
    totalWeightKg: s.total_weight_kg != null ? Number(s.total_weight_kg) : null,
    packedAt: s.packed_at,
    dispatchedAt: s.dispatched_at,
    deliveredAt: s.delivered_at,
    estimatedDeliveryAt: s.estimated_delivery_at,
    createdAt: s.created_at,
  };
}

export function mapService(m: ShippingService) {
  return {
    id: m.id,
    partnerId: m.partner_id,
    code: m.code,
    name: m.name,
    serviceType: m.service_type,
    isCodSupported: m.is_cod_supported,
    status: m.status,
  };
}

export function mapPickupPoint(p: PickupPoint) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    city: p.city,
    postalCode: p.postal_code,
    pointType: p.point_type,
    status: p.status,
  };
}

export function mapSlot(s: DeliverySlot) {
  return {
    id: s.id,
    shipmentId: s.shipment_id,
    slotStart: s.slot_start,
    slotEnd: s.slot_end,
    isConfirmed: s.is_confirmed,
  };
}
