import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../shared/cache/cache.service';
import { CATALOG_CACHE } from '../constants/catalog.constants';

@Injectable()
export class CatalogCacheService {
  constructor(private readonly cache: CacheService) {}

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl = CATALOG_CACHE.TTL): Promise<T> {
    const hit = await this.cache.get<T>(key);
    if (hit !== null) return hit;
    const value = await factory();
    await this.cache.set(key, value, ttl);
    return value;
  }

  listHash(filters: Record<string, unknown>): string {
    return createHash('sha1').update(JSON.stringify(filters)).digest('hex').slice(0, 16);
  }

  async invalidateAll(): Promise<void> {
    await this.cache.delByPrefix(`${CATALOG_CACHE.PREFIX}:`);
  }

  async invalidateProduct(id: string, slug?: string): Promise<void> {
    await this.cache.del(CATALOG_CACHE.product(id));
    if (slug) await this.cache.del(CATALOG_CACHE.product(slug));
    await this.cache.del(CATALOG_CACHE.featured());
    await this.cache.del(CATALOG_CACHE.newest());
    await this.cache.del(CATALOG_CACHE.refurbished());
    await this.cache.delByPrefix('catalog:products:list:');
  }

  async invalidateTaxonomy(): Promise<void> {
    await this.cache.del(CATALOG_CACHE.brands());
    await this.cache.del(CATALOG_CACHE.categories());
    await this.cache.del(CATALOG_CACHE.categoryTree());
    await this.cache.del(CATALOG_CACHE.collections());
    await this.cache.delByPrefix('catalog:products:list:');
  }
}
