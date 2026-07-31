import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { LockService } from '../../../shared/lock/lock.service';
import { StateMachineEngine } from '../../../shared/state-machine/state-machine.engine';
import {
  reverseShipmentStateMachine,
  rtoStateMachine,
} from '../definitions/reverse.definition';
import { CreateReverseDto, CreateRtoDto } from '../dto/shipping.dto';
import { ShipmentRtoEvent, ShipmentReturnedEvent } from '../events/shipping.events';
import { ShippingEventPublisher } from '../events/shipping-event.publisher';
import {
  SHIPPING_PROVIDER,
  type ShippingProvider,
} from '../interfaces/shipping-provider.interface';
import { ShipmentRepository } from '../repositories/shipment.repository';
import { ShippingCacheService } from './shipping-cache.service';
import { SHIPMENT_STATUS } from '../constants/shipping.constants';
import { shipmentStateMachine } from '../../../shared/state-machine';

@Injectable()
export class ReverseLogisticsService {
  private readonly logger = new Logger(ReverseLogisticsService.name);

  constructor(
    private readonly repo: ShipmentRepository,
    private readonly locks: LockService,
    private readonly events: ShippingEventPublisher,
    private readonly cache: ShippingCacheService,
    private readonly stateMachine: StateMachineEngine,
    @Inject(SHIPPING_PROVIDER) private readonly provider: ShippingProvider,
  ) {}

  async createReverse(actorId: string, dto: CreateReverseDto) {
    return this.locks.withLock(
      LockService.resourceKey('shipping', 'reverse', dto.orderId),
      async () => {
        const order = await this.repo.client.order.findFirst({
          where: { id: dto.orderId, deleted_at: null },
        });
        if (!order) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Order not found', 404);
        }

        const partner =
          (dto.partnerId
            ? await this.repo.client.shippingPartner.findFirst({
                where: { id: dto.partnerId, deleted_at: null },
              })
            : null) ?? (await this.repo.findPrimaryPartner());
        if (!partner) {
          throw new AppException(
            ErrorCodes.INTERNAL_ERROR,
            'Partner unavailable',
            503,
          );
        }

        const reverseNumber = `REV-${Date.now().toString(36).toUpperCase()}`;
        const row = await this.repo.client.reverseShipment.create({
          data: {
            reverse_number: reverseNumber,
            reverse_type: dto.reverseType,
            order_id: dto.orderId,
            return_id: dto.returnId,
            exchange_request_id: dto.exchangeRequestId,
            warehouse_id: dto.warehouseId,
            partner_id: partner.id,
            shipment_id: dto.shipmentId,
            status: 'requested',
            requested_at: new Date(),
            created_by: actorId,
          },
        });

        this.logger.log(`reverse created ${row.id} order=${dto.orderId}`);
        return {
          id: row.id,
          reverseNumber: row.reverse_number,
          status: row.status,
          reverseType: row.reverse_type,
        };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async scheduleReversePickup(actorId: string, reverseId: string) {
    const reverse = await this.repo.client.reverseShipment.findFirst({
      where: { id: reverseId, deleted_at: null },
    });
    if (!reverse) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'Reverse shipment not found', 404);
    }

    await this.stateMachine.transition(reverseShipmentStateMachine, {
      entityId: reverseId,
      from: reverse.status,
      to: 'scheduled',
      actorId,
      apply: async () =>
        this.repo.client.reverseShipment.update({
          where: { id: reverseId },
          data: { status: 'scheduled', updated_by: actorId },
        }),
    });

    return { id: reverseId, status: 'scheduled' };
  }

  async createRto(actorId: string, dto: CreateRtoDto) {
    return this.locks.withLock(
      LockService.resourceKey('shipping', 'rto', dto.forwardShipmentId),
      async () => {
        const forward = await this.repo.findById(dto.forwardShipmentId);
        if (!forward) {
          throw new AppException(ErrorCodes.NOT_FOUND, 'Shipment not found', 404);
        }

        const rto = await this.repo.client.rtoShipment.create({
          data: {
            forward_shipment_id: forward.id,
            warehouse_id: forward.warehouse_id,
            partner_id: forward.partner_id,
            reason: dto.reason,
            tracking_number: forward.tracking_number,
            awb_number: forward.awb_number,
            status: 'initiated',
            initiated_at: new Date(),
            created_by: actorId,
          },
        });

        if (
          forward.status === SHIPMENT_STATUS.OUT_FOR_DELIVERY ||
          forward.status === SHIPMENT_STATUS.IN_TRANSIT ||
          forward.status === SHIPMENT_STATUS.DELIVERY_FAILED ||
          forward.status === SHIPMENT_STATUS.DISPATCHED
        ) {
          await this.stateMachine.transition(shipmentStateMachine, {
            entityId: forward.id,
            from: forward.status,
            to: SHIPMENT_STATUS.RETURNED,
            actorId,
            reason: dto.reason ?? 'RTO',
            apply: async () =>
              this.repo.update(forward.id, {
                status: SHIPMENT_STATUS.RETURNED,
                updated_by: actorId,
              }),
            audit: async () => {
              await this.repo.appendTrackingEvent({
                shipmentId: forward.id,
                eventStatus: SHIPMENT_STATUS.RETURNED,
                description: `RTO ${rto.id}`,
                actorId,
              });
            },
          });
        }

        this.events.rto(
          new ShipmentRtoEvent({
            shipmentId: forward.id,
            orderId: forward.order_id,
            status: SHIPMENT_STATUS.RETURNED,
            trackingNumber: forward.tracking_number,
            carrier: this.provider.code,
            rtoId: rto.id,
          }),
        );
        this.events.returned(
          new ShipmentReturnedEvent({
            shipmentId: forward.id,
            orderId: forward.order_id,
            status: SHIPMENT_STATUS.RETURNED,
            trackingNumber: forward.tracking_number,
            carrier: this.provider.code,
          }),
        );

        await this.cache.invalidateShipment(forward.id);
        return {
          id: rto.id,
          forwardShipmentId: forward.id,
          status: rto.status,
        };
      },
      { ttlMs: 30_000, waitMs: 5_000 },
    );
  }

  async advanceRto(actorId: string, rtoId: string, to: string) {
    const rto = await this.repo.client.rtoShipment.findFirst({
      where: { id: rtoId, deleted_at: null },
    });
    if (!rto) {
      throw new AppException(ErrorCodes.NOT_FOUND, 'RTO not found', 404);
    }
    await this.stateMachine.transition(rtoStateMachine, {
      entityId: rtoId,
      from: rto.status,
      to,
      actorId,
      apply: async () =>
        this.repo.client.rtoShipment.update({
          where: { id: rtoId },
          data: {
            status: to as never,
            received_at: to === 'received' ? new Date() : rto.received_at,
            updated_by: actorId,
          },
        }),
    });
    return { id: rtoId, status: to };
  }
}
