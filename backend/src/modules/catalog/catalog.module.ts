import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { LockModule } from '../../shared/lock/lock.module';
import { AdminCatalogController } from './controllers/admin-catalog.controller';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogEventPublisher } from './events/catalog-event.publisher';
import { BrandRepository } from './repositories/brand.repository';
import { CatalogAuxRepository } from './repositories/catalog-aux.repository';
import { CategoryRepository } from './repositories/category.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { ProductRepository } from './repositories/product.repository';
import { VariantRepository } from './repositories/variant.repository';
import { CatalogCacheService } from './services/catalog-cache.service';
import { CatalogService } from './services/catalog.service';

@Module({
  imports: [PrismaModule, CacheModule, LockModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [
    BrandRepository,
    CategoryRepository,
    CollectionRepository,
    ProductRepository,
    VariantRepository,
    CatalogAuxRepository,
    CatalogCacheService,
    CatalogService,
    CatalogEventPublisher,
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
