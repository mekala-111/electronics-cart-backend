import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterWarrantyDto {
  @ApiProperty()
  @IsUUID()
  planId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serialNumberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;
}

export class CreateClaimDto {
  @ApiProperty()
  @IsUUID()
  registrationId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  issueSummary!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issueDetail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  claimAmount?: number;
}

export class PatchClaimDto {
  @ApiProperty({
    enum: [
      'under_review',
      'approved',
      'rejected',
      'in_service',
      'closed',
      'cancelled',
    ],
  })
  @IsString()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreatePlanDto {
  @ApiProperty()
  @IsUUID()
  providerId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: ['manufacturer', 'extended', 'adp', 'amc'] })
  @IsEnum(['manufacturer', 'extended', 'adp', 'amc'])
  planType!: 'manufacturer' | 'extended' | 'adp' | 'amc';

  @ApiProperty()
  @IsInt()
  @Min(1)
  durationMonths!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  claimLimit?: number;
}

export class CreateRmaDto {
  @ApiProperty({ enum: ['doa', 'warranty_repair', 'replacement', 'refund'] })
  @IsEnum(['doa', 'warranty_repair', 'replacement', 'refund'])
  rmaType!: 'doa' | 'warranty_repair' | 'replacement' | 'refund';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  claimId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serialNumberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PatchRmaDto {
  @ApiProperty({
    enum: [
      'approved',
      'rejected',
      'in_transit',
      'received',
      'completed',
      'cancelled',
    ],
  })
  @IsString()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ExtendWarrantyDto {
  @ApiProperty()
  @IsUUID()
  registrationId!: string;

  @ApiProperty()
  @IsUUID()
  planId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  purchaseAmount?: number;
}

export class TransferWarrantyDto {
  @ApiProperty()
  @IsUUID()
  registrationId!: string;

  @ApiProperty()
  @IsUUID()
  toCustomerId!: string;
}

export class RmaRefundDto {
  @ApiProperty()
  @IsUUID()
  paymentId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class CreateTicketDto {
  @ApiProperty()
  @IsUUID()
  serviceCenterId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  claimId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  registrationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serialNumberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priority?: number;
}

export class AssignTechnicianDto {
  @ApiProperty()
  @IsUUID()
  ticketId!: string;

  @ApiProperty()
  @IsUUID()
  technicianId!: string;
}

export class CreateRepairJobDto {
  @ApiProperty()
  @IsUUID()
  ticketId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  laborCost?: number;
}

export class PatchRepairJobDto {
  @ApiPropertyOptional({
    enum: [
      'assigned',
      'in_progress',
      'on_hold',
      'resolved',
      'closed',
      'cancelled',
    ],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: ['pending', 'repaired', 'irreparable', 'replaced', 'customer_declined'],
  })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  repairNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  repairMinutes?: number;
}

export class CreateDiagnosticDto {
  @ApiProperty()
  @IsUUID()
  ticketId!: string;

  @ApiProperty()
  @IsString()
  findings!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendedAction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isWarrantyCovered?: boolean;
}

export class AllocateLoanDeviceDto {
  @ApiProperty()
  @IsUUID()
  loanDeviceId!: string;

  @ApiProperty()
  @IsUUID()
  ticketId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueBackAt?: string;
}

export class UseSparePartDto {
  @ApiProperty()
  @IsUUID()
  repairJobId!: string;

  @ApiProperty()
  @IsUUID()
  repairPartId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isWarrantyCovered?: boolean;
}
