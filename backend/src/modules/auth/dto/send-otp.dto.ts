import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendOtpDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  destination!: string;

  @ApiProperty({ enum: OtpChannel })
  @IsEnum(OtpChannel)
  channel!: OtpChannel;

  @ApiProperty({ enum: OtpPurpose })
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}
