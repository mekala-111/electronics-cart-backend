import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ example: 1299.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  savedPaymentMethodId?: string;
}

export class RefundPaymentDto {
  @ApiProperty({ example: 100 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  reasonCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  items?: Array<{ orderItemId?: string; amount: number; quantity?: number }>;
}

export class SavePaymentMethodDto {
  @ApiProperty()
  @IsUUID()
  gatewayId!: string;

  @ApiProperty({ description: 'Gateway token — never a raw PAN' })
  @IsString()
  @MaxLength(255)
  token!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4)
  lastFour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  expiryMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  expiryYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isDefault?: boolean;
}

export class CreateDisputeDto {
  @ApiProperty()
  @IsUUID()
  paymentId!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  gatewayDisputeId?: string;

  @ApiPropertyOptional({ description: 'Evidence metadata only — no file bytes' })
  @IsOptional()
  evidence?: Record<string, unknown>;
}

export class UpdateDisputeDto {
  @ApiPropertyOptional({
    enum: ['opened', 'under_review', 'won', 'lost', 'withdrawn'],
  })
  @IsOptional()
  @IsEnum(['opened', 'under_review', 'won', 'lost', 'withdrawn'])
  status?: 'opened' | 'under_review' | 'won' | 'lost' | 'withdrawn';

  @ApiPropertyOptional()
  @IsOptional()
  evidence?: Record<string, unknown>;
}

export class CreateSettlementDto {
  @ApiProperty()
  @IsUUID()
  gatewayId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  settlementRef!: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsString()
  settlementDate!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  expectedAmount!: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  receivedAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  feeAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  taxAmount?: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class ReconcileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  settlementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gatewayReference?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  expectedAmount!: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  receivedAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class HistoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
