import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { LockModule } from '../../shared/lock/lock.module';
import { AdminInventoryController } from './controllers/admin-inventory.controller';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryEventPublisher } from './events/inventory-event.publisher';
import { InventoryRepository } from './repositories/inventory.repository';
import { ProcurementRepository } from './repositories/procurement.repository';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { InventoryCacheService } from './services/inventory-cache.service';
import { InventoryService } from './services/inventory.service';

@Module({
  imports: [PrismaModule, CacheModule, LockModule],
  controllers: [InventoryController, AdminInventoryController],
  providers: [
    WarehouseRepository,
    InventoryRepository,
    ProcurementRepository,
    InventoryCacheService,
    InventoryService,
    InventoryEventPublisher,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
