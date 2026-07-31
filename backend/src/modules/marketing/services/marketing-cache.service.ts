import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../shared/cache/cache.service';
import { MARKETING_CACHE } from '../constants/marketing.constants';

@Injectable()
export class MarketingCacheService {
  constructor(private readonly cache: CacheService) {}

  getOrSet<T>(key: string, factory: () => Promise<T>, ttl = MARKETING_CACHE.TTL) {
    return this.cache.get<T>(key).then(async (hit) => {
      if (hit !== null) return hit;
      const value = await factory();
      await this.cache.set(key, value, ttl);
      return value;
    });
  }

  async invalidatePage(slug: string) {
    await this.cache.del(MARKETING_CACHE.page(slug));
  }
  async invalidateNav() {
    await this.cache.del(MARKETING_CACHE.nav());
  }
  async invalidateBanners() {
    await this.cache.del(MARKETING_CACHE.banners());
  }
  async invalidateFlags() {
    await this.cache.del(MARKETING_CACHE.flags());
  }
  async invalidateCoupon(code: string) {
    await this.cache.del(MARKETING_CACHE.coupon(code.toUpperCase()));
  }
  async invalidateRecs(productId: string) {
    await this.cache.del(MARKETING_CACHE.recs(productId));
  }
}
