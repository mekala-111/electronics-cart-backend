import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cartTotal!: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  brandIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];
}

export class ApplyCouponDto extends ValidateCouponDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;
}

export class CreateCmsPageDto {
  @ApiProperty()
  @IsString()
  @MaxLength(220)
  slug!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pageType?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  sections?: Array<{
    sectionKey: string;
    sectionType: string;
    title?: string;
    configJson?: object;
    sortOrder?: number;
  }>;
}

export class PatchCmsPageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';
}

export class CreateBannerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  mediaFileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class CreatePopupDto extends CreateBannerDto {}

export class CreateBlogDto {
  @ApiProperty()
  @IsString()
  @MaxLength(220)
  slug!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class CreateCampaignDto {
  @ApiProperty({ enum: ['email', 'sms', 'push', 'notification'] })
  @IsEnum(['email', 'sms', 'push', 'notification'])
  channel!: 'email' | 'sms' | 'push' | 'notification';

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  segmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  launch?: boolean;
}

export class CreateCouponDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['flat', 'percentage'] })
  @IsEnum(['flat', 'percentage'])
  discountType!: 'flat' | 'percentage';

  @ApiProperty()
  @IsNumber()
  discountValue!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minCartValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  usageLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  perUserLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  brandIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  categoryIds?: string[];
}

export class LoyaltyEarnDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  orderTotal!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ruleCode?: string;
}

export class LoyaltyRedeemDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  points!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateReferralProgramDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  referrerPoints?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  refereePoints?: number;
}

export class ClaimReferralDto {
  @ApiProperty()
  @IsString()
  programCode!: string;

  @ApiProperty()
  @IsUUID()
  referrerId!: string;
}

export class CreateFeatureFlagDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: ['enabled', 'disabled', 'conditional'] })
  @IsOptional()
  @IsEnum(['enabled', 'disabled', 'conditional'])
  status?: 'enabled' | 'disabled' | 'conditional';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  defaultValue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditionsJson?: object;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rolloutPercent?: number;
}

export class CreateSearchKeywordDto {
  @ApiProperty()
  @IsString()
  keyword!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  boost?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  synonyms?: string[];
}

export class CreateRecommendationDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsUUID()
  recommendedProductId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  conditionsJson?: object;
}

export class CreateAbTestDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  targetType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetKey?: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbVariantDto)
  variants!: AbVariantDto[];
}

export class AbVariantDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isControl?: boolean;

  @ApiProperty()
  @IsNumber()
  weightPercent!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  configJson?: object;
}

export class RecommendationsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    enum: ['related', 'fbt', 'recent'],
  })
  @IsOptional()
  @IsString()
  type?: string;
}
