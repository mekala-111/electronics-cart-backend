import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password.validator';

export class RegisterDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @ValidateIf((dto: RegisterDto) => !dto.mobile)
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+15551234567' })
  @ValidateIf((dto: RegisterDto) => !dto.email)
  @IsString()
  @MaxLength(20)
  @IsOptional()
  mobile?: string;

  @ApiPropertyOptional({ example: 'SecurePass1!' })
  @IsStrongPassword()
  password!: string;
}
