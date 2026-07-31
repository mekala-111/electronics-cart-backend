import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { IsSlug } from '../validators/slug.validator';

export class CreateCollectionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsSlug()
  @MaxLength(220)
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mediaFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];
}

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {}

export class AssignCollectionProductsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds!: string[];
}
