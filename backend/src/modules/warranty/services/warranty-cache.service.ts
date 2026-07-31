import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../shared/cache/cache.service';
import { WARRANTY_CACHE } from '../constants/warranty.constants';

@Injectable()
export class WarrantyCacheService {
  constructor(private readonly cache: CacheService) {}

  getOrSet<T>(key: string, factory: () => Promise<T>, ttl = WARRANTY_CACHE.TTL) {
    return this.cache.get<T>(key).then(async (hit) => {
      if (hit !== null) return hit;
      const value = await factory();
      await this.cache.set(key, value, ttl);
      return value;
    });
  }

  async invalidatePlans() {
    await this.cache.del(WARRANTY_CACHE.plans());
  }

  async invalidateSerial(serial: string) {
    await this.cache.del(WARRANTY_CACHE.serial(serial));
  }

  async invalidateClaim(id: string) {
    await this.cache.del(WARRANTY_CACHE.claim(id));
  }

  async invalidateCenters() {
    await this.cache.del(WARRANTY_CACHE.centers());
  }

  async invalidateDevice(serialId: string) {
    await this.cache.del(WARRANTY_CACHE.device(serialId));
  }
}
