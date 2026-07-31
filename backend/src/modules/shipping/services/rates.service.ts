import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppException } from '../../../core/errors/app.exception';
import { ErrorCodes } from '../../../core/errors/error-codes';
import { SHIPPING_CACHE } from '../constants/shipping.constants';
import {
  CreateCarrierDto,
  CreateRateDto,
  EstimateShippingDto,
} from '../dto/shipping.dto';
import { mapPickupPoint, mapService, mapSlot } from '../mappers/shipping.mapper';
import { ShipmentRepository } from '../repositories/shipment.repository';
import { ShippingCacheService } from './shipping-cache.service';

@Injectable()
export class RatesService {
  constructor(
    private readonly repo: ShipmentRepository,
    private readonly cache: ShippingCacheService,
  ) {}

  listMethods() {
    return this.cache.getOrSet(SHIPPING_CACHE.methods(), async () => {
      const rows = await this.repo.listServices();
      return rows.map(mapService);
    });
  }

  listPickupPoints() {
    return this.cache.getOrSet(SHIPPING_CACHE.pickupPoints(), async () => {
      const rows = await this.repo.listPickupPoints();
      return rows.map(mapPickupPoint);
    });
  }

  listDeliverySlots() {
    return this.cache.getOrSet(SHIPPING_CACHE.slots(), async () => {
      const rows = await this.repo.listSlots();
      return rows.map(mapSlot);
    });
  }

  async estimate(dto: EstimateShippingDto) {
    const key = [
      dto.fromPincode,
      dto.toPincode,
      dto.weightKg,
      dto.cod ? 'cod' : 'ppd',
      dto.partnerId ?? 'any',
    ].join(':');

    return this.cache.getOrSet(SHIPPING_CACHE.rates(key), async () => {
      const fromZone = await this.findZone(dto.fromPincode);
      const toZone = await this.findZone(dto.toPincode);
      if (!fromZone || !toZone) {
        throw new AppException(
          ErrorCodes.BAD_REQUEST,
          'Shipping zone not found for pincode',
          400,
        );
      }

      const rates = await this.repo.client.shippingRate.findMany({
        where: {
          deleted_at: null,
          status: 'active',
          min_weight_kg: { lte: dto.weightKg },
          OR: [
            { max_weight_kg: null },
            { max_weight_kg: { gte: dto.weightKg } },
          ],
          ...(dto.partnerId
            ? { rate_card: { partner_id: dto.partnerId } }
            : {}),
        },
        include: {
          rate_card: { include: { partner: true, service: true } },
          from_zone: true,
          to_zone: true,
        },
        take: 20,
      });

      const quotes = rates
        .filter((r) => {
          if (r.from_zone_id && r.from_zone_id !== fromZone.id) return false;
          if (r.to_zone_id && r.to_zone_id !== toZone.id) return false;
          return true;
        })
        .map((r) => {
          const billable = Math.max(
            dto.weightKg,
            Number(r.min_weight_kg),
          );
          let amount =
            Number(r.base_rate) +
            Number(r.per_kg_rate) * Math.max(0, billable - Number(r.min_weight_kg));
          const codFee = dto.cod ? Math.min(50, amount * 0.02) : 0;
          const insurance =
            dto.declaredValue && dto.declaredValue > 0
              ? Number(dto.declaredValue) * 0.005
              : 0;
          amount += codFee + insurance;
          return {
            rateId: r.id,
            partnerId: r.rate_card.partner_id,
            partnerCode: r.rate_card.partner.code,
            serviceId: r.rate_card.service_id,
            serviceName: r.rate_card.service?.name,
            currency: r.currency,
            baseRate: Number(r.base_rate),
            perKgRate: Number(r.per_kg_rate),
            codFee,
            insurance,
            total: Number(amount.toFixed(2)),
            fromZone: fromZone.code,
            toZone: toZone.code,
          };
        })
        .sort((a, b) => a.total - b.total);

      return { quotes, fromZone: fromZone.code, toZone: toZone.code };
    });
  }

  async listRates(fromPincode?: string, toPincode?: string, weightKg = 1) {
    return this.estimate({
      fromPincode: fromPincode ?? '500001',
      toPincode: toPincode ?? '110001',
      weightKg,
    });
  }

  async createRate(actorId: string, dto: CreateRateDto) {
    const row = await this.repo.client.shippingRate.create({
      data: {
        rate_card_id: dto.rateCardId,
        from_zone_id: dto.fromZoneId,
        to_zone_id: dto.toZoneId,
        min_weight_kg: dto.minWeightKg,
        max_weight_kg: dto.maxWeightKg,
        base_rate: dto.baseRate,
        per_kg_rate: dto.perKgRate,
        created_by: actorId,
      },
    });
    await this.cache.invalidateRates();
    return {
      id: row.id,
      baseRate: Number(row.base_rate),
      perKgRate: Number(row.per_kg_rate),
    };
  }

  async createCarrier(actorId: string, dto: CreateCarrierDto) {
    const row = await this.repo.client.shippingPartner.create({
      data: {
        code: dto.code as 'shiprocket',
        name: dto.name,
        is_primary: dto.isPrimary ?? false,
        config_json: scrubSecrets(dto.configJson) as Prisma.InputJsonValue | undefined,
        created_by: actorId,
      },
    });
    await this.cache.invalidateMethods();
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      isPrimary: row.is_primary,
    };
  }

  private async findZone(pincode: string) {
    return this.repo.client.shippingZone.findFirst({
      where: {
        deleted_at: null,
        status: 'active',
        pincode_from: { lte: pincode },
        pincode_to: { gte: pincode },
      },
    });
  }
}

function scrubSecrets(
  config?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!config) return undefined;
  const out = { ...config };
  for (const k of Object.keys(out)) {
    const lower = k.toLowerCase();
    if (
      lower.includes('secret') ||
      lower.includes('password') ||
      lower.includes('token')
    ) {
      delete out[k];
    }
  }
  return out;
}
