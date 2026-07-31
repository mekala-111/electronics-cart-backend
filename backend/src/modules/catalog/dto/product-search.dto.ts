import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ProductSearchDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collectionSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'ProductCondition enum value' })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ description: 'StockStatus enum value' })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated attribute_value ids',
  })
  @IsOptional()
  @IsString()
  attributes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  featured?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  refurbished?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  newArrival?: string;

  @ApiPropertyOptional({
    enum: ['price_asc', 'price_desc', 'newest', 'rating', 'name'],
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
