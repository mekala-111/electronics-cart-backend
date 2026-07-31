import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password.validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @ApiProperty()
  @IsStrongPassword()
  newPassword!: string;

  @ApiPropertyOptional({ description: 'Keep this session active after password change' })
  @IsOptional()
  @IsUUID()
  keepSessionId?: string;
}
