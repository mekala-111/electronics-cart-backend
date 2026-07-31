import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../shared/cache/cache.service';
import { INVENTORY_CACHE } from '../constants/inventory.constants';

@Injectable()
export class InventoryCacheService {
  constructor(private readonly cache: CacheService) {}

  getOrSet<T>(key: string, factory: () => Promise<T>, ttl = INVENTORY_CACHE.TTL) {
    return this.cache.get<T>(key).then(async (hit) => {
      if (hit !== null) return hit;
      const value = await factory();
      await this.cache.set(key, value, ttl);
      return value;
    });
  }

  async invalidateStock(warehouseId: string, variantId: string): Promise<void> {
    await this.cache.del(INVENTORY_CACHE.stock(warehouseId, variantId));
    await this.cache.del(INVENTORY_CACHE.availability(variantId));
  }

  async invalidateWarehouses(): Promise<void> {
    await this.cache.del(INVENTORY_CACHE.warehouses());
    await this.cache.delByPrefix('inventory:warehouse:');
  }

  async invalidateSerial(serial: string): Promise<void> {
    await this.cache.del(INVENTORY_CACHE.serial(serial));
  }
}
