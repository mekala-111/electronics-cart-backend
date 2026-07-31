import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PackageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  packageNumber!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  weightKg!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lengthCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  widthCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  declaredValue?: number;
}

export class ShipmentItemDto {
  @ApiProperty()
  @IsUUID()
  orderItemId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageNumber?: string;
}

export class CreateShipmentDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shippingAddressId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fulfillmentOrderId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  cod?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  declaredValue?: number;

  @ApiProperty({ type: [PackageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageDto)
  packages!: PackageDto[];

  @ApiPropertyOptional({ type: [ShipmentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  items?: ShipmentItemDto[];
}

export class EstimateShippingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(12)
  fromPincode!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(12)
  toPincode!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  weightKg!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cod?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  declaredValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partnerId?: string;
}

export class RatesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromPincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toPincode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weightKg?: number;
}

export class UpdateShipmentStatusDto {
  @ApiProperty({
    enum: [
      'packed',
      'dispatched',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'delivery_failed',
      'returned',
      'lost',
      'damaged',
      'cancelled',
    ],
  })
  @IsString()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SchedulePickupDto {
  @ApiProperty()
  @IsUUID()
  shipmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateLabelDto {
  @ApiProperty()
  @IsUUID()
  shipmentId!: string;
}

export class CreateReverseDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shipmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  returnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  exchangeRequestId?: string;

  @ApiProperty({
    enum: ['customer_return', 'warranty_return', 'exchange_pickup'],
  })
  @IsEnum(['customer_return', 'warranty_return', 'exchange_pickup'])
  reverseType!: 'customer_return' | 'warranty_return' | 'exchange_pickup';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partnerId?: string;
}

export class CreateRtoDto {
  @ApiProperty()
  @IsUUID()
  forwardShipmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateRateDto {
  @ApiProperty()
  @IsUUID()
  rateCardId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fromZoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  toZoneId?: string;

  @ApiProperty()
  @IsNumber()
  minWeightKg!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxWeightKg?: number;

  @ApiProperty()
  @IsNumber()
  baseRate!: number;

  @ApiProperty()
  @IsNumber()
  perKgRate!: number;
}

export class CreateCarrierDto {
  @ApiProperty({ enum: ['shiprocket', 'delhivery', 'bluedart', 'dtdc', 'other'] })
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Non-secret config only in responses' })
  @IsOptional()
  configJson?: Record<string, unknown>;
}
