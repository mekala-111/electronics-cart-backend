import { Injectable } from '@nestjs/common';
import { Prisma, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ShipmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  get client() {
    return this.prisma;
  }

  findById(id: string) {
    return this.prisma.shipment.findFirst({
      where: { id, deleted_at: null },
      include: {
        partner: true,
        service: true,
        packages: true,
        items: true,
        labels: true,
        tracking: true,
        tracking_events: { orderBy: { occurred_at: 'desc' }, take: 50 },
        cost_breakdown: true,
        insurance: true,
      },
    });
  }

  findByTracking(trackingNumber: string) {
    return this.prisma.shipment.findFirst({
      where: {
        OR: [
          { tracking_number: trackingNumber },
          { awb_number: trackingNumber },
        ],
        deleted_at: null,
      },
      include: { partner: true, tracking: true },
    });
  }

  create(data: Prisma.ShipmentUncheckedCreateInput) {
    return this.prisma.shipment.create({
      data,
      include: { partner: true, packages: true },
    });
  }

  update(id: string, data: Prisma.ShipmentUncheckedUpdateInput) {
    return this.prisma.shipment.update({
      where: { id },
      data,
      include: { partner: true },
    });
  }

  findPrimaryPartner() {
    return this.prisma.shippingPartner.findFirst({
      where: { is_primary: true, status: 'active', deleted_at: null },
    });
  }

  findPartnerByCode(code: 'shiprocket') {
    return this.prisma.shippingPartner.findFirst({
      where: { code, status: 'active', deleted_at: null },
    });
  }

  listServices() {
    return this.prisma.shippingService.findMany({
      where: { status: 'active', deleted_at: null },
      orderBy: { name: 'asc' },
    });
  }

  listPickupPoints() {
    return this.prisma.pickupPoint.findMany({
      where: { status: 'active', deleted_at: null },
      take: 100,
    });
  }

  listSlots() {
    return this.prisma.deliverySlot.findMany({
      where: { status: 'active', deleted_at: null, is_confirmed: false },
      orderBy: { slot_start: 'asc' },
      take: 50,
    });
  }

  async appendTrackingEvent(data: {
    shipmentId: string;
    trackingId?: string;
    eventStatus: string;
    eventCode?: string;
    description?: string;
    location?: string;
    occurredAt?: Date;
    raw?: Prisma.InputJsonValue;
    actorId?: string;
  }) {
    return this.prisma.trackingEvent.create({
      data: {
        shipment_id: data.shipmentId,
        tracking_id: data.trackingId,
        event_status: data.eventStatus as ShipmentStatus,
        event_code: data.eventCode,
        description: data.description,
        location: data.location,
        occurred_at: data.occurredAt ?? new Date(),
        raw_payload: data.raw,
        created_by: data.actorId,
      },
    });
  }

  upsertTracking(
    shipmentId: string,
    data: {
      currentStatus: ShipmentStatus | string;
      lastLocation?: string;
      exceptionCode?: string;
      exceptionNote?: string;
      rawSnapshot?: Prisma.InputJsonValue;
    },
  ) {
    const status = data.currentStatus as ShipmentStatus;
    return this.prisma.shipmentTracking.upsert({
      where: { shipment_id: shipmentId },
      create: {
        shipment_id: shipmentId,
        current_status: status,
        last_location: data.lastLocation,
        last_event_at: new Date(),
        exception_code: data.exceptionCode,
        exception_note: data.exceptionNote,
        raw_snapshot: data.rawSnapshot,
      },
      update: {
        current_status: status,
        last_location: data.lastLocation,
        last_event_at: new Date(),
        exception_code: data.exceptionCode,
        exception_note: data.exceptionNote,
        raw_snapshot: data.rawSnapshot,
      },
    });
  }
}

export type { ShipmentStatus };
