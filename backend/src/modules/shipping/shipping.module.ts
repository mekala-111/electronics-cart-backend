import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { LockModule } from '../../shared/lock/lock.module';
import { AdminShippingController } from './controllers/admin-shipping.controller';
import { ShippingController } from './controllers/shipping.controller';
import { ShippingEventPublisher } from './events/shipping-event.publisher';
import { SHIPPING_PROVIDER } from './interfaces/shipping-provider.interface';
import { ShiprocketProvider } from './providers/shiprocket.provider';
import { ShipmentRepository } from './repositories/shipment.repository';
import { ShippingWebhookRepository } from './repositories/shipping-webhook.repository';
import { RatesService } from './services/rates.service';
import { ReverseLogisticsService } from './services/reverse-logistics.service';
import { ShippingBootstrapService } from './services/shipping-bootstrap.service';
import { ShippingCacheService } from './services/shipping-cache.service';
import { ShippingService } from './services/shipping.service';
import { ShippingWebhookService } from './services/shipping-webhook.service';
import { ShippingWorker } from './workers/shipping.worker';

@Module({
  imports: [PrismaModule, CacheModule, LockModule],
  controllers: [ShippingController, AdminShippingController],
  providers: [
    ShipmentRepository,
    ShippingWebhookRepository,
    ShippingCacheService,
    ShippingEventPublisher,
    ShiprocketProvider,
    { provide: SHIPPING_PROVIDER, useExisting: ShiprocketProvider },
    ShippingService,
    RatesService,
    ReverseLogisticsService,
    ShippingWebhookService,
    ShippingBootstrapService,
    ShippingWorker,
  ],
  exports: [ShippingService, RatesService, ReverseLogisticsService],
})
export class ShippingModule {}
