import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import { INVENTORY_PERMISSIONS } from '../constants/inventory.constants';
import {
  AdjustStockDto,
  CreateGoodsReceiptDto,
  CreatePurchaseOrderDto,
  CreateTransferDto,
  ReserveStockDto,
  UpdateRefurbishmentDto,
} from '../dto/stock.dto';
import { CreateLocationDto, CreateWarehouseDto, UpdateWarehouseDto } from '../dto/warehouse.dto';
import { InventoryService } from '../services/inventory.service';

@ApiTags('inventory-admin')
@ApiBearerAuth()
@ApiHeader({ name: 'Idempotency-Key', required: false })
@Roles('admin', 'super_admin')
@Permissions(INVENTORY_PERMISSIONS.WRITE)
@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Idempotent()
  @Post('warehouses')
  createWarehouse(@Body() dto: CreateWarehouseDto, @CurrentUser() user: AuthUser) {
    return this.inventory.createWarehouse(dto, user.sub);
  }

  @Patch('warehouses/:id')
  updateWarehouse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventory.updateWarehouse(id, dto, user.sub);
  }

  @Delete('warehouses/:id')
  deleteWarehouse(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.deleteWarehouse(id);
  }

  @Idempotent()
  @Post('locations')
  createLocation(@Body() dto: CreateLocationDto, @CurrentUser() user: AuthUser) {
    return this.inventory.createLocation(dto, user.sub);
  }

  @Idempotent()
  @Post('reserve')
  reserve(@Body() dto: ReserveStockDto, @CurrentUser() user: AuthUser) {
    return this.inventory.reserve(dto, user.sub);
  }

  @Post('reservations/:id/release')
  release(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.inventory.releaseReservation(id, user.sub);
  }

  @Idempotent()
  @Post('adjustments')
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: AuthUser) {
    return this.inventory.adjust(dto, user.sub);
  }

  @Idempotent()
  @Post('goods-receipts')
  goodsReceipt(@Body() dto: CreateGoodsReceiptDto, @CurrentUser() user: AuthUser) {
    return this.inventory.createGoodsReceipt(dto, user.sub);
  }

  @Idempotent()
  @Post('transfers')
  transfer(@Body() dto: CreateTransferDto, @CurrentUser() user: AuthUser) {
    return this.inventory.createTransfer(dto, user.sub);
  }

  @Idempotent()
  @Post('purchase-orders')
  createPo(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.inventory.createPurchaseOrder(dto, user.sub);
  }

  @Get('purchase-orders')
  @Permissions(INVENTORY_PERMISSIONS.READ)
  listPos() {
    return this.inventory.listPurchaseOrders();
  }

  @Get('low-stock-alerts')
  @Permissions(INVENTORY_PERMISSIONS.READ)
  lowStock() {
    return this.inventory.listLowStockAlerts();
  }

  @Get('cycle-counts')
  @Permissions(INVENTORY_PERMISSIONS.READ)
  cycleCounts(@Query('warehouseId') warehouseId?: string) {
    return this.inventory.listCycleCounts(warehouseId);
  }

  @Idempotent()
  @Post('cycle-counts')
  createCycleCount(
    @Body() body: { warehouseId: string; jobNumber: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventory.createCycleCount(body.warehouseId, body.jobNumber, user.sub);
  }

  @Patch('serials/:id/refurbishment')
  updateRefurb(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRefurbishmentDto,
  ) {
    return this.inventory.updateRefurbishment(id, dto);
  }
}
