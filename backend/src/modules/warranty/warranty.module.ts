import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { LockModule } from '../../shared/lock/lock.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsModule } from '../payments/payments.module';
import { ShippingModule } from '../shipping/shipping.module';
import {
  AdminServiceController,
  AdminWarrantyController,
} from './controllers/admin-warranty.controller';
import {
  ServiceController,
  WarrantyController,
} from './controllers/warranty.controller';
import { WarrantyEventPublisher } from './events/warranty-event.publisher';
import { WarrantyRepository } from './repositories/warranty.repository';
import { RmaService } from './services/rma.service';
import { ServiceOpsService } from './services/service-ops.service';
import { WarrantyBootstrapService } from './services/warranty-bootstrap.service';
import { WarrantyCacheService } from './services/warranty-cache.service';
import { WarrantyService } from './services/warranty.service';
import { RepairJobStore } from './stores/repair-job.store';
import { RmaStore } from './stores/rma.store';
import { ServiceTicketStore } from './stores/service-ticket.store';
import { WarrantyClaimStore } from './stores/warranty-claim.store';
import { WarrantyWorker } from './workers/warranty.worker';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    LockModule,
    InventoryModule,
    PaymentsModule,
    ShippingModule,
  ],
  controllers: [
    WarrantyController,
    ServiceController,
    AdminWarrantyController,
    AdminServiceController,
  ],
  providers: [
    WarrantyRepository,
    WarrantyCacheService,
    WarrantyEventPublisher,
    WarrantyClaimStore,
    RmaStore,
    ServiceTicketStore,
    RepairJobStore,
    WarrantyService,
    RmaService,
    ServiceOpsService,
    WarrantyBootstrapService,
    WarrantyWorker,
  ],
  exports: [WarrantyService, RmaService, ServiceOpsService],
})
export class WarrantyModule {}
