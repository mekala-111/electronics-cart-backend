import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class DashboardQueryDto {
  @ApiPropertyOptional({
    enum: [
      'executive',
      'sales',
      'revenue',
      'orders',
      'payments',
      'inventory',
      'shipping',
      'warranty',
      'service',
      'marketing',
      'search',
      'recommendation',
      'system',
    ],
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}

export class TrendsQueryDto {
  @ApiPropertyOptional({ default: 'sales' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  domain?: string;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly'] })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  period?: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ description: 'Days lookback', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;
}

export class CreateSavedReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: 'sales' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  reportType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  query?: Record<string, unknown>;
}

export class CreateScheduleDto {
  @ApiProperty()
  @IsUUID()
  savedReportId!: string;

  @ApiProperty({ example: '0 9 * * *' })
  @IsString()
  @MaxLength(120)
  cronExpression!: string;

  @ApiPropertyOptional({ default: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  recipients?: string[];
}

export class CreateAlertRuleDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ enum: ['info', 'warning', 'critical'] })
  @IsOptional()
  @IsIn(['info', 'warning', 'critical'])
  severity?: 'info' | 'warning' | 'critical';

  @ApiProperty({
    description: 'RuleEngine condition tree',
    example: { field: 'revenue.deltaPct', lt: -10 },
  })
  @IsObject()
  condition!: Record<string, unknown>;

  @ApiPropertyOptional({ default: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  cooldownMinutes?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class CreateKpiDto {
  @ApiProperty({ example: 'sales' })
  @IsString()
  @MaxLength(64)
  domain!: string;

  @ApiProperty({ example: 'daily', enum: ['daily', 'weekly', 'monthly'] })
  @IsIn(['daily', 'weekly', 'monthly'])
  period!: 'daily' | 'weekly' | 'monthly';

  @ApiProperty({
    description: 'KPI metrics payload stored on KpiSnapshot.metrics_json',
  })
  @IsObject()
  metrics!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Optional RuleEngine threshold condition',
  })
  @IsOptional()
  @IsObject()
  threshold?: Record<string, unknown>;
}

export class PatchDashboardDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        widgetCode: { type: 'string' },
        title: { type: 'string' },
        gridX: { type: 'number' },
        gridY: { type: 'number' },
        gridW: { type: 'number' },
        gridH: { type: 'number' },
        config: { type: 'object' },
      },
    },
  })
  @IsOptional()
  @IsArray()
  widgets?: Array<{
    widgetCode: string;
    title?: string;
    gridX?: number;
    gridY?: number;
    gridW?: number;
    gridH?: number;
    config?: Record<string, unknown>;
  }>;
}

export class GenerateReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  savedReportId?: string;

  @ApiPropertyOptional({ enum: ['csv', 'xlsx', 'pdf', 'json'], default: 'csv' })
  @IsOptional()
  @IsIn(['csv', 'xlsx', 'pdf', 'json'])
  format?: 'csv' | 'xlsx' | 'pdf' | 'json';
}

export class RefreshDashboardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string;
}
