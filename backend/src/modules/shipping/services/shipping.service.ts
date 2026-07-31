import { Inject, Injectable, Logger } from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { TransactionContext } from '../../../shared/context/transaction-context';
import { LockService } from '../../../shared/lock/lock.service';
import { QUEUE_NAMES } from '../../../shared/queue/queue.constants';
import { QueueService } from '../../../shared/queue/queue.service';
import { shipmentStateMachine } from '../../../shared/state-machine';
import { StateMachineEngine } from '../../../shared/state-machine/state-machine.engine';
import {
  SHIPMENT_STATUS,
  SHIPPING_CACHE,
  SHIPPING_JOBS,
} from '../constants/shipping.constants';
import {
  CreateShipmentDto,
  GenerateLabelDto,
  SchedulePickupDto,
  UpdateShipmentStatusDto,
} from '../dto/shipping.dto';
import {
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
} from '../events/shipping.events';
import { ShippingEventPublisher } from '../events/shipping-event.publisher';
import {
  SHIPPING_PROVIDER,
  type ShippingProvider,
} from '../interfaces/shipping-provider.interface';
import { mapShipment } from '../mappers/shipping.mapper';
import { ShipmentRepository } from '../repositories/shipment.repository';
import { ShippingCacheService } from './shipping-cache.service';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly repo: ShipmentRepository,
    private readonly cache: ShippingCacheService,
    private readonly locks: LockService,
    private readonly events: ShippingEventPublisher,
    private readonly queues: QueueService,
    private readonly stateMachine: StateMachineEngine,
    @Inject(SHIPPING_PROVIDER) private readonly provider: ShippingProvider,
  ) {}

  async createShipment(actorId: string, dto: CreateShipmentDto) {
    return this.locks.withLock(
      LockService.resourceKey('shipping', 'create', dto.orderId),
      async () => {
        const order = await this.repo.client.order.findFirst({
          where: { id: dto.orderId, deleted_at: null },
          include: {
            addresses: true,
            items: true,
          },
        });
        if (!order) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
        }

        const partner =
          (dto.partnerId
            ? await this.repo.client.shippingPartner.findFirst({
                where: { id: dto.partnerId, status: 'active', deleted_at: null },
              })
            : null) ??
          (await this.repo.findPrimaryPartner()) ??
          (await this.repo.findPartnerByCode('shiprocket'));

        if (!partner) {
          throw new AppException(
            ErrorCodes.INTERNAL_ERROR,
            'Shipping partner unavailable',
            503,
          );
        }

        for (const pkg of dto.packages) {
          if (pkg.weightKg <= 0) {
            throw new AppException(ErrorCodes.BAD_REQUEST, 'Invalid weight', 400);
          }
        }

        const totalWeight = dto.packages.reduce((s, p) => s + p.weightKg, 0);
        const shippingAddress =
          order.addresses.find((a) => a.address_type === 'shipping') ??
          order.addresses[0];

        const shipmentNumber = `SHP-${Date.now().toString(36).toUpperCase()}`;
        const pickupPincode = '500001';
        const deliveryPincode =
          shippingAddress?.postal_code ?? '110001';

        const carrier = await this.provider.createShipment({
          orderId: order.id,
          shipmentNumber,
          weightKg: totalWeight,
          lengthCm: dto.packages[0]?.lengthCm,
          widthCm: dto.packages[0]?.widthCm,
          heightCm: dto.packages[0]?.heightCm,
          declaredValue: dto.declaredValue ?? Number(order.grand_total),
          codAmount: dto.cod ? Number(order.grand_total) : 0,
          pickupPincode,
          deliveryPincode,
          customerName: shippingAddress?.full_name ?? 'Customer',
          customerPhone: shippingAddress?.phone ?? undefined,
          customerAddress: shippingAddress?.line1 ?? 'Address',
          customerCity: shippingAddress?.city ?? 'City',
          customerState: shippingAddress?.state ?? 'State',
        });

        const shipment = await this.repo.create({
          shipment_number: shipmentNumber,
          order_id: order.id,
          fulfillment_order_id: dto.fulfillmentOrderId,
          warehouse_id: dto.warehouseId,
          partner_id: partner.id,
          service_id: dto.serviceId,
          shipping_address_id: dto.shippingAddressId ?? shippingAddress?.id,
          tracking_number: carrier.trackingNumber,
          awb_number: carrier.awbNumber,
          partner_shipment_ref: carrier.partnerShipmentRef,
          declared_value: dto.declaredValue ?? Number(order.grand_total),
          total_weight_kg: totalWeight,
          status: SHIPMENT_STATUS.CREATED,
          created_by: actorId,
        });

        await this.repo.client.shipmentPackage.createMany({
          data: dto.packages.map((p) => ({
            shipment_id: shipment.id,
            package_number: p.packageNumber,
            weight_kg: p.weightKg,
            length_cm: p.lengthCm,
            width_cm: p.widthCm,
            height_cm: p.heightCm,
            declared_value: p.declaredValue,
            created_by: actorId,
          })),
        });

        if (dto.items?.length) {
          await this.repo.client.shipmentItem.createMany({
            data: dto.items.map((i) => ({
              shipment_id: shipment.id,
              order_item_id: i.orderItemId,
              quantity: i.quantity,
              created_by: actorId,
            })),
          });
        }

        if (carrier.awbNumber) {
          await this.repo.client.awbNumber.create({
            data: {
              partner_id: partner.id,
              awb_number: carrier.awbNumber,
              shipment_id: shipment.id,
              assigned_at: new Date(),
              status: 'assigned',
              created_by: actorId,
            },
          });
        }

        await this.repo.upsertTracking(shipment.id, {
          currentStatus: SHIPMENT_STATUS.CREATED,
        });
        await this.auditEvent(shipment.id, SHIPMENT_STATUS.CREATED, 'Shipment created', actorId);

        this.events.created(
          new ShipmentCreatedEvent({
            shipmentId: shipment.id,
            orderId: order.id,
            status: SHIPMENT_STATUS.CREATED,
            trackingNumber: shipment.tracking_number,
            carrier: this.provider.code,
          }),
        );

        this.logger.log(
          `shipment created id=${shipment.id} order=${order.id} corr=${TransactionContext.get()?.correlationId}`,
        );
        return mapShipment(shipment);
      },
      { ttlMs: 45_000, waitMs: 10_000 },
    );
  }

  async generateLabel(actorId: string, dto: GenerateLabelDto) {
    return this.locks.withLock(
      LockService.resourceKey('shipping', 'label', dto.shipmentId),
      async () => {
        const shipment = await this.requireShipment(dto.shipmentId);
        if (!shipment.partner_shipment_ref) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            'Missing partner shipment ref',
            409,
          );
        }

        const label = await this.provider.generateLabel({
          partnerShipmentRef: shipment.partner_shipment_ref,
          awbNumber: shipment.awb_number ?? undefined,
        });

        await this.repo.client.shipmentLabel.create({
          data: {
            shipment_id: shipment.id,
            label_url: label.labelUrl,
            label_format: label.format,
            generated_at: new Date(),
            created_by: actorId,
          },
        });

        // Conceptual label_generated → locked status packed
        if (shipment.status === SHIPMENT_STATUS.CREATED) {
          await this.transitionStatus(shipment.id, SHIPMENT_STATUS.PACKED, actorId, {
            reason: 'Label generated',
          });
        }

        this.events.labelGenerated(
          new ShipmentLabelGeneratedEvent({
            shipmentId: shipment.id,
            orderId: shipment.order_id,
            status: SHIPMENT_STATUS.PACKED,
            trackingNumber: shipment.tracking_number,
            carrier: this.provider.code,
          }),
        );

        await this.cache.invalidateShipment(shipment.id);
        return { shipmentId: shipment.id, labelUrl: label.labelUrl, format: label.format };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async schedulePickup(actorId: string, dto: SchedulePickupDto) {
    return this.locks.withLock(
      LockService.resourceKey('shipping', 'pickup', dto.shipmentId),
      async () => {
        const shipment = await this.requireShipment(dto.shipmentId);
        if (!shipment.partner_shipment_ref) {
          throw new AppException(
            ErrorCodes.CONFLICT,
            'Missing partner shipment ref',
            409,
          );
        }

        const pkgCount = await this.repo.client.shipmentPackage.count({
          where: { shipment_id: shipment.id, deleted_at: null },
        });

        const pickup = await this.provider.schedulePickup({
          partnerShipmentRef: shipment.partner_shipment_ref,
          warehouseId: shipment.warehouse_id,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          packageCount: Math.max(pkgCount, 1),
        });

        const request = await this.repo.client.pickupRequest.create({
          data: {
            warehouse_id: shipment.warehouse_id,
            partner_id: shipment.partner_id,
            partner_pickup_ref: pickup.partnerPickupRef,
            scheduled_at: pickup.scheduledAt ?? new Date(),
            package_count: Math.max(pkgCount, 1),
            status: 'scheduled',
            notes: dto.notes,
            created_by: actorId,
          },
        });

        await this.repo.update(shipment.id, {
          pickup_request_id: request.id,
          updated_by: actorId,
        });

        // Conceptual pickup_scheduled / picked_up → dispatched
        if (
          shipment.status === SHIPMENT_STATUS.PACKED ||
          shipment.status === SHIPMENT_STATUS.CREATED
        ) {
          if (shipment.status === SHIPMENT_STATUS.CREATED) {
            await this.transitionStatus(shipment.id, SHIPMENT_STATUS.PACKED, actorId, {
              reason: 'Auto-pack before pickup',
            });
          }
          await this.transitionStatus(
            shipment.id,
            SHIPMENT_STATUS.DISPATCHED,
            actorId,
            { reason: 'Pickup scheduled' },
          );
        }

        this.events.pickupScheduled(
          new ShipmentPickupScheduledEvent({
            shipmentId: shipment.id,
            orderId: shipment.order_id,
            status: SHIPMENT_STATUS.DISPATCHED,
            trackingNumber: shipment.tracking_number,
            carrier: this.provider.code,
          }),
        );
        this.events.pickedUp(
          new ShipmentPickedUpEvent({
            shipmentId: shipment.id,
            orderId: shipment.order_id,
            status: SHIPMENT_STATUS.DISPATCHED,
            trackingNumber: shipment.tracking_number,
            carrier: this.provider.code,
          }),
        );

        await this.cache.invalidateShipment(shipment.id);
        return {
          shipmentId: shipment.id,
          pickupRequestId: request.id,
          partnerPickupRef: pickup.partnerPickupRef,
        };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async updateStatus(
    actorId: string,
    shipmentId: string,
    dto: UpdateShipmentStatusDto,
  ) {
    return this.locks.withLock(
      LockService.resourceKey('shipping', 'status', shipmentId),
      async () => {
        const updated = await this.transitionStatus(
          shipmentId,
          dto.status as ShipmentStatus,
          actorId,
          { reason: dto.reason },
        );
        await this.cache.invalidateShipment(shipmentId);
        return mapShipment(updated);
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async getShipment(id: string) {
    return this.cache.getOrSet(SHIPPING_CACHE.shipment(id), async () => {
      const s = await this.requireShipment(id);
      return mapShipment(s);
    });
  }

  async getTracking(id: string) {
    return this.cache.getOrSet(SHIPPING_CACHE.tracking(id), async () => {
      const s = await this.requireShipment(id);
      return {
        shipmentId: s.id,
        status: s.status,
        trackingNumber: s.tracking_number,
        awbNumber: s.awb_number,
        current: s.tracking
          ? {
              status: s.tracking.current_status,
              location: s.tracking.last_location,
              lastEventAt: s.tracking.last_event_at,
            }
          : null,
        events: (s.tracking_events ?? []).map((e) => ({
          status: e.event_status,
          code: e.event_code,
          description: e.description,
          location: e.location,
          occurredAt: e.occurred_at,
        })),
      };
    });
  }

  async syncTracking(shipmentId: string, actorId?: string) {
    return this.locks.withLock(
      LockService.resourceKey('shipping', 'tracking', shipmentId),
      async () => {
        const shipment = await this.requireShipment(shipmentId);
        const sync = await this.provider.syncTracking({
          trackingNumber: shipment.tracking_number ?? undefined,
          awbNumber: shipment.awb_number ?? undefined,
          partnerShipmentRef: shipment.partner_shipment_ref ?? undefined,
        });

        const mapped = mapCarrierStatus(sync.status);
        if (mapped && mapped !== shipment.status) {
          try {
            await this.transitionStatus(shipmentId, mapped, actorId, {
              reason: 'Carrier tracking sync',
              silentEvent: false,
            });
          } catch {
            // illegal transition from carrier noise — still record events
          }
        }

        await this.repo.upsertTracking(shipmentId, {
          currentStatus: mapped ?? sync.status,
          lastLocation: sync.location,
          rawSnapshot: sync.raw as object,
        });

        for (const ev of sync.events) {
          await this.repo.appendTrackingEvent({
            shipmentId,
            eventStatus: ev.status,
            eventCode: ev.code,
            description: ev.description,
            location: ev.location,
            occurredAt: ev.occurredAt,
            raw: sync.raw as object,
            actorId,
          });
        }

        if (sync.eta) {
          await this.repo.client.shipmentEtaHistory.create({
            data: {
              shipment_id: shipmentId,
              old_eta: shipment.estimated_delivery_at,
              new_eta: sync.eta,
              reason: 'Carrier sync',
              source: this.provider.code,
              created_by: actorId,
            },
          });
          await this.repo.update(shipmentId, {
            estimated_delivery_at: sync.eta,
          });
        }

        await this.cache.invalidateShipment(shipmentId);
        return this.getTracking(shipmentId);
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async enqueueTrackingSync(shipmentId: string) {
    await this.queues.enqueue(
      QUEUE_NAMES.SHIPPING,
      SHIPPING_JOBS.TRACKING_SYNC,
      { shipmentId },
      { attempts: 5, backoff: { type: 'exponential', delay: 3000 } },
    );
  }

  private async transitionStatus(
    shipmentId: string,
    to: ShipmentStatus | string,
    actorId?: string,
    opts?: { reason?: string; silentEvent?: boolean },
  ) {
    const shipment = await this.requireShipment(shipmentId);
    const result = await this.stateMachine.transition(shipmentStateMachine, {
      entityId: shipmentId,
      from: shipment.status,
      to,
      actorId,
      reason: opts?.reason,
      apply: async () => {
        const data: Record<string, unknown> = {
          status: to,
          updated_by: actorId,
        };
        if (to === SHIPMENT_STATUS.PACKED) data.packed_at = new Date();
        if (to === SHIPMENT_STATUS.DISPATCHED) data.dispatched_at = new Date();
        if (to === SHIPMENT_STATUS.DELIVERED) data.delivered_at = new Date();
        return this.repo.update(shipmentId, data);
      },
      audit: async (ctx) => {
        await this.auditEvent(
          shipmentId,
          ctx.to,
          opts?.reason ?? `Status ${ctx.from} → ${ctx.to}`,
          actorId,
        );
        await this.repo.upsertTracking(shipmentId, {
          currentStatus: ctx.to,
        });
      },
    });

    if (!result.skipped && !opts?.silentEvent) {
      this.emitStatusEvent(shipment.order_id, shipmentId, to, shipment.tracking_number);
    }

    // Best-effort fulfillment sync without mutating Orders APIs for order.status
    if (
      shipment.fulfillment_order_id &&
      (to === SHIPMENT_STATUS.DISPATCHED ||
        to === SHIPMENT_STATUS.DELIVERED ||
        to === SHIPMENT_STATUS.PACKED)
    ) {
      const fulStatus =
        to === SHIPMENT_STATUS.DELIVERED
          ? 'delivered'
          : to === SHIPMENT_STATUS.DISPATCHED
            ? 'shipped'
            : 'packed';
      try {
        await this.repo.client.fulfillmentOrder.update({
          where: { id: shipment.fulfillment_order_id },
          data: { status: fulStatus as never, updated_by: actorId },
        });
      } catch {
        /* fulfillment may not accept status */
      }
    }

    return result.result;
  }

  private emitStatusEvent(
    orderId: string,
    shipmentId: string,
    status: string,
    trackingNumber?: string | null,
  ) {
    const payload = {
      shipmentId,
      orderId,
      status,
      trackingNumber,
      carrier: this.provider.code,
    };
    switch (status) {
      case SHIPMENT_STATUS.IN_TRANSIT:
        this.events.inTransit(new ShipmentInTransitEvent(payload));
        break;
      case SHIPMENT_STATUS.OUT_FOR_DELIVERY:
        this.events.outForDelivery(new ShipmentOutForDeliveryEvent(payload));
        break;
      case SHIPMENT_STATUS.DELIVERED:
        this.events.delivered(new ShipmentDeliveredEvent(payload));
        break;
      case SHIPMENT_STATUS.DELIVERY_FAILED:
        this.events.deliveryFailed(new ShipmentDeliveryFailedEvent(payload));
        break;
      case SHIPMENT_STATUS.RETURNED:
        this.events.returned(new ShipmentReturnedEvent(payload));
        break;
      case SHIPMENT_STATUS.CANCELLED:
        this.events.cancelled(new ShipmentCancelledEvent(payload));
        break;
      default:
        break;
    }
  }

  private async auditEvent(
    shipmentId: string,
    status: string,
    description: string,
    actorId?: string,
  ) {
    // No shipping_audit_logs table — TrackingEvent is the durable history stream
    await this.repo.appendTrackingEvent({
      shipmentId,
      eventStatus: status,
      description,
      actorId,
    });
  }

  private async requireShipment(id: string) {
    const s = await this.repo.findById(id);
    if (!s) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Shipment not found', 404);
    }
    return s;
  }
}

function mapCarrierStatus(raw: string): ShipmentStatus | null {
  const s = raw.toLowerCase().replace(/\s+/g, '_');
  const map: Record<string, ShipmentStatus> = {
    created: 'created',
    packed: 'packed',
    dispatched: 'dispatched',
    picked_up: 'dispatched',
    in_transit: 'in_transit',
    transit: 'in_transit',
    out_for_delivery: 'out_for_delivery',
    ofd: 'out_for_delivery',
    delivered: 'delivered',
    delivery_failed: 'delivery_failed',
    undelivered: 'delivery_failed',
    returned: 'returned',
    rto: 'returned',
    cancelled: 'cancelled',
    lost: 'lost',
    damaged: 'damaged',
  };
  return map[s] ?? null;
}
