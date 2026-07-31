import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateVariantDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  sku!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  mrp!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  salePrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gpu?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stockStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  batteryHealth?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attributeValueIds?: string[];
}

export class UpdateVariantDto extends PartialType(CreateVariantDto) {}
