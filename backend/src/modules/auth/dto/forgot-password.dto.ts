import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email or mobile number' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  identifier!: string;
}
