import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsPositiveQty } from '../validators/positive-qty.validator';

export class ReserveStockDto {
  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsPositiveQty()
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cartId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionKey?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  ttlMinutes?: number;
}

export class AdjustStockDto {
  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @IsUUID()
  binId!: string;

  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ description: 'Can be negative; result available must be >= 0' })
  @IsInt()
  quantityDelta!: number;

  @ApiPropertyOptional({
    enum: ['cycle_count', 'damage', 'theft', 'write_off', 'found', 'correction', 'other'],
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GoodsReceiptItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsPositiveQty()
  quantityReceived!: number;

  @ApiProperty()
  @IsUUID()
  binId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  unitCost?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];
}

export class CreateGoodsReceiptDto {
  @ApiProperty()
  @IsString()
  grnNumber!: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [GoodsReceiptItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items!: GoodsReceiptItemDto[];
}

export class TransferItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsPositiveQty()
  quantity!: number;

  @ApiProperty({ description: 'Source bin' })
  @IsUUID()
  fromBinId!: string;

  @ApiProperty({ description: 'Destination bin' })
  @IsUUID()
  toBinId!: string;
}

export class CreateTransferDto {
  @ApiProperty()
  @IsString()
  transferNumber!: string;

  @ApiProperty()
  @IsUUID()
  fromWarehouseId!: string;

  @ApiProperty()
  @IsUUID()
  toWarehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items!: TransferItemDto[];
}

export class PurchaseOrderItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty()
  @IsPositiveQty()
  quantityOrdered!: number;

  @ApiProperty()
  unitCost!: number;

  @ApiPropertyOptional()
  @IsOptional()
  taxPercent?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  poNumber!: string;

  @ApiProperty()
  @IsUUID()
  supplierId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];
}

export class UpdateRefurbishmentDto {
  @ApiProperty({
    enum: ['received', 'inspection', 'repair', 'testing', 'ready_for_sale', 'rejected'],
  })
  @IsString()
  refurbishmentStatus!: string;
}

export class InventoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
