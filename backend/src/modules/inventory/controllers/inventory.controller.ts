import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { InventoryQueryDto } from '../dto/stock.dto';
import { InventoryService } from '../services/inventory.service';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List inventory rows' })
  list(@Query() query: InventoryQueryDto) {
    return this.inventory.listInventory(query);
  }

  @Public()
  @Get('stock')
  @ApiOperation({ summary: 'Stock summary for warehouse + variant' })
  stock(
    @Query('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Query('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.inventory.getStock(warehouseId, variantId);
  }

  @Public()
  @Get('warehouse-availability')
  @ApiOperation({ summary: 'Availability of a variant across warehouses' })
  availability(@Query('variantId', ParseUUIDPipe) variantId: string) {
    return this.inventory.warehouseAvailability(variantId);
  }

  @Public()
  @Get('warehouses')
  listWarehouses() {
    return this.inventory.listWarehouses();
  }

  @Public()
  @Get('warehouses/:id')
  getWarehouse(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.getWarehouse(id);
  }

  @Public()
  @Get('serial/:serial')
  @ApiOperation({ summary: 'Lookup serial number' })
  serialLookup(@Param('serial') serial: string) {
    return this.inventory.serialLookup(serial);
  }
}
