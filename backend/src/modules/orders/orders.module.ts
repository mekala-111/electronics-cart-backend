import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { LockModule } from '../../shared/lock/lock.module';
import { WorkflowModule } from '../../shared/workflow/workflow.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminOrdersController } from './controllers/admin-orders.controller';
import { OrdersController } from './controllers/orders.controller';
import { OrdersEventPublisher } from './events/orders-event.publisher';
import { CartRepository } from './repositories/cart.repository';
import { FulfillmentRepository } from './repositories/fulfillment.repository';
import { OrderRepository } from './repositories/order.repository';
import { WishlistRepository } from './repositories/wishlist.repository';
import { CartService } from './services/cart.service';
import { CheckoutService } from './services/checkout.service';
import { OrdersCacheService } from './services/orders-cache.service';
import { OrdersService } from './services/orders.service';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    LockModule,
    WorkflowModule,
    InventoryModule,
    PaymentsModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [
    CartRepository,
    OrderRepository,
    WishlistRepository,
    FulfillmentRepository,
    OrdersCacheService,
    CartService,
    CheckoutService,
    OrdersService,
    OrdersEventPublisher,
  ],
  exports: [OrdersService, CartService, CheckoutService],
})
export class OrdersModule {}
