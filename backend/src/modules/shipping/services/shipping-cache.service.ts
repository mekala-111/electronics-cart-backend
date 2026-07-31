import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../shared/cache/cache.service';
import { SHIPPING_CACHE } from '../constants/shipping.constants';

@Injectable()
export class ShippingCacheService {
  constructor(private readonly cache: CacheService) {}

  getOrSet<T>(key: string, factory: () => Promise<T>, ttl = SHIPPING_CACHE.TTL) {
    return this.cache.get<T>(key).then(async (hit) => {
      if (hit !== null) return hit;
      const value = await factory();
      await this.cache.set(key, value, ttl);
      return value;
    });
  }

  async invalidateShipment(id: string): Promise<void> {
    await this.cache.del(SHIPPING_CACHE.shipment(id));
    await this.cache.del(SHIPPING_CACHE.tracking(id));
  }

  async invalidateMethods(): Promise<void> {
    await this.cache.del(SHIPPING_CACHE.methods());
  }

  async invalidateRates(): Promise<void> {
    await this.cache.delByPrefix('shipping:rates:');
  }

  async invalidateCatalog(): Promise<void> {
    await this.cache.del(SHIPPING_CACHE.slots());
    await this.cache.del(SHIPPING_CACHE.pickupPoints());
  }
}
