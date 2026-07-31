import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../validators/is-strong-password.validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Email or mobile where OTP was sent' })
  @IsString()
  @MaxLength(255)
  destination!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(4)
  @MaxLength(12)
  code!: string;

  @ApiProperty()
  @IsStrongPassword()
  newPassword!: string;
}
