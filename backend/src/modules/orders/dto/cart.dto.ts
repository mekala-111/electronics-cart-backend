import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CartQueryDto {
  @ApiPropertyOptional({ description: 'Guest session key when unauthenticated' })
  @IsOptional()
  @IsString()
  sessionKey?: string;
}
