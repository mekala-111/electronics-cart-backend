import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsUuidString } from '../../../common/validators/is-uuid-string.validator';

export class AddressDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  fullName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  line1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiProperty()
  @IsString()
  state!: string;

  @ApiPropertyOptional({ default: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty()
  @IsString()
  postalCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gstin?: string;
}

export class CheckoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUuidString()
  cartId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionKey?: string;

  @ApiProperty()
  @IsUuidString()
  warehouseId!: string;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  shipping!: AddressDto;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billing?: AddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  giftCardCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  walletAmount?: number;
}

export class CancelOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUuidString()
  cancellationReasonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class ReturnRequestDto {
  @ApiProperty()
  @IsUuidString()
  orderItemId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ExchangeRequestDto {
  @ApiProperty()
  @IsUuidString()
  orderItemId!: string;

  @ApiProperty({ enum: ['same_variant', 'different_variant', 'store_credit'] })
  @IsString()
  exchangeType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUuidString()
  toVariantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateFulfillmentDto {
  @ApiProperty()
  @IsUuidString()
  warehouseId!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  orderItemIds?: string[];
}

export class WishlistItemDto {
  @ApiProperty()
  @IsUuidString()
  variantId!: string;
}
