import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import { ORDERS_PERMISSIONS } from '../constants/orders.constants';
import { CancelOrderDto, CreateFulfillmentDto } from '../dto/checkout.dto';
import { OrdersService } from '../services/orders.service';

@ApiTags('orders-admin')
@ApiBearerAuth()
@ApiHeader({ name: 'Idempotency-Key', required: false })
@Roles('admin', 'super_admin')
@Permissions(ORDERS_PERMISSIONS.WRITE)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @Permissions(ORDERS_PERMISSIONS.READ)
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.orders.adminList(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
    );
  }

  @Get('invoices')
  @Permissions(ORDERS_PERMISSIONS.READ)
  listInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orders.listInvoices(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get(':id')
  @Permissions(ORDERS_PERMISSIONS.READ)
  detail(@Param('id') id: string) {
    return this.orders.getOrder(id);
  }

  @Idempotent()
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.cancel(id, user.sub, dto, true);
  }

  @Idempotent()
  @Post(':id/fulfillments')
  createFulfillment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFulfillmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.createFulfillment(id, dto, user.sub);
  }

  @Idempotent()
  @Patch('fulfillments/:id/status')
  updateFulfillment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: 'picking' | 'packed' | 'shipped' | 'delivered' | 'cancelled' },
  ) {
    return this.orders.updateFulfillmentStatus(id, body.status);
  }

  @Idempotent()
  @Post(':id/invoices')
  createInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.createInvoice(id, user.sub);
  }

  @Get(':id/risk')
  @Permissions(ORDERS_PERMISSIONS.READ)
  risk(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.risk(id);
  }
}
