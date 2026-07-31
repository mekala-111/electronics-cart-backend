import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(32)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerUserId?: string;
}

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}

export class CreateLocationDto {
  @ApiProperty()
  @IsUUID()
  warehouseId!: string;

  @ApiProperty({ description: 'Zone code' })
  @IsString()
  zoneCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneName?: string;

  @ApiProperty({ description: 'Rack code under zone' })
  @IsString()
  rackCode!: string;

  @ApiProperty({ description: 'Bin code under rack' })
  @IsString()
  binCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  binBarcode?: string;
}
