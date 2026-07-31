import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * User model has no name/avatar/timezone/language columns.
 * Profile updates are limited to `mobile` until Customer profile lands in a later phase.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '+15551234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;
}
