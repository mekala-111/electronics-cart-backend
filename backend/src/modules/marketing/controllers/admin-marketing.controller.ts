import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import {
  CMS_PERMISSIONS,
  MARKETING_PERMISSIONS,
} from '../constants/marketing.constants';
import {
  ClaimReferralDto,
  CreateAbTestDto,
  CreateBannerDto,
  CreateBlogDto,
  CreateCampaignDto,
  CreateCmsPageDto,
  CreateCouponDto,
  CreateFeatureFlagDto,
  CreatePopupDto,
  CreateRecommendationDto,
  CreateReferralProgramDto,
  CreateSearchKeywordDto,
  LoyaltyEarnDto,
  PatchCmsPageDto,
} from '../dto/marketing.dto';
import { CmsService } from '../services/cms.service';
import { CouponService } from '../services/coupon.service';
import {
  AbTestService,
  CampaignService,
  FeatureFlagService,
  LoyaltyService,
  MarketingDashboardService,
  RecommendationService,
  ReferralService,
  SearchMarketingService,
} from '../services/growth.services';

@ApiTags('admin-cms')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
@Permissions(CMS_PERMISSIONS.WRITE)
@Controller('admin')
export class AdminCmsController {
  constructor(private readonly cms: CmsService) {}

  @Post('cms/pages')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createPage(@CurrentUser() user: AuthUser, @Body() dto: CreateCmsPageDto) {
    return this.cms.createPage(user.sub, dto);
  }

  @Patch('cms/pages/:id')
  @Idempotent()
  patchPage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchCmsPageDto,
  ) {
    return this.cms.patchPage(user.sub, id, dto);
  }

  @Post('banners')
  @Idempotent()
  createBanner(@CurrentUser() user: AuthUser, @Body() dto: CreateBannerDto) {
    return this.cms.createBanner(user.sub, dto);
  }

  @Post('popups')
  @Idempotent()
  createPopup(@CurrentUser() user: AuthUser, @Body() dto: CreatePopupDto) {
    return this.cms.createPopup(user.sub, dto);
  }

  @Post('blogs')
  @Idempotent()
  createBlog(@CurrentUser() user: AuthUser, @Body() dto: CreateBlogDto) {
    return this.cms.createBlog(user.sub, dto);
  }
}

@ApiTags('admin-marketing')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
@Permissions(MARKETING_PERMISSIONS.WRITE)
@Controller('admin')
export class AdminMarketingController {
  constructor(
    private readonly coupons: CouponService,
    private readonly campaigns: CampaignService,
    private readonly loyaltyService: LoyaltyService,
    private readonly referrals: ReferralService,
    private readonly flags: FeatureFlagService,
    private readonly search: SearchMarketingService,
    private readonly recs: RecommendationService,
    private readonly ab: AbTestService,
    private readonly dashboard: MarketingDashboardService,
  ) {}

  @Get('marketing/dashboard')
  @Permissions(MARKETING_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Marketing ops dashboard' })
  dash() {
    return this.dashboard.dashboard();
  }

  @Post('campaigns')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createCampaign(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaigns.create(user.sub, dto);
  }

  @Post('coupons')
  @Idempotent()
  createCoupon(@CurrentUser() user: AuthUser, @Body() dto: CreateCouponDto) {
    return this.coupons.create(user.sub, dto);
  }

  @Post('loyalty')
  @Idempotent()
  @ApiOperation({ summary: 'Create reward rule or earn points' })
  loyalty(
    @CurrentUser() user: AuthUser,
    @Body()
    body: LoyaltyEarnDto & {
      code?: string;
      name?: string;
      pointsPerRupee?: number;
      fixedPoints?: number;
      minOrderAmount?: number;
      tierRequired?: string;
    },
  ) {
    if (body.code && body.name) {
      return this.loyaltyService.createRewardRule(user.sub, {
        code: body.code,
        name: body.name,
        pointsPerRupee: body.pointsPerRupee,
        fixedPoints: body.fixedPoints,
        minOrderAmount: body.minOrderAmount,
        tierRequired: body.tierRequired,
      });
    }
    return this.loyaltyService.earn(user.sub, body);
  }

  @Post('referrals')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  referralsAdmin(
    @CurrentUser() user: AuthUser,
    @Body()
    body: CreateReferralProgramDto | (ClaimReferralDto & { claim?: boolean }),
  ) {
    if ('claim' in body && body.claim) {
      return this.referrals.claim(user.sub, body as ClaimReferralDto);
    }
    return this.referrals.createProgram(
      user.sub,
      body as CreateReferralProgramDto,
    );
  }

  @Post('feature-flags')
  @Idempotent()
  createFlag(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFeatureFlagDto,
  ) {
    return this.flags.create(user.sub, dto);
  }

  @Post('search')
  @Idempotent()
  createSearch(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSearchKeywordDto,
  ) {
    return this.search.createKeyword(user.sub, dto);
  }

  @Post('recommendations')
  @Idempotent()
  createRec(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRecommendationDto,
  ) {
    return this.recs.create(user.sub, dto);
  }

  @Post('ab-tests')
  @Idempotent()
  createAb(@CurrentUser() user: AuthUser, @Body() dto: CreateAbTestDto) {
    return this.ab.create(user.sub, dto);
  }
}
