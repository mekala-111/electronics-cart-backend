import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import type { AuthUser } from '../../../common/types/auth-user.type';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import {
  ApplyCouponDto,
  RecommendationsQueryDto,
  ValidateCouponDto,
} from '../dto/marketing.dto';
import { CmsService } from '../services/cms.service';
import { CouponService } from '../services/coupon.service';
import {
  FeatureFlagService,
  RecommendationService,
  SearchMarketingService,
} from '../services/growth.services';

@ApiTags('cms')
@Controller()
export class CmsPublicController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get('cms/pages/:slug')
  @ApiOperation({ summary: 'Get published CMS page by slug' })
  page(@Param('slug') slug: string) {
    return this.cms.getPageBySlug(slug);
  }

  @Public()
  @Get('blog')
  @ApiOperation({ summary: 'List published blog posts' })
  blogs() {
    return this.cms.listBlogs();
  }

  @Public()
  @Get('blog/:slug')
  @ApiOperation({ summary: 'Get blog post by slug' })
  blog(@Param('slug') slug: string) {
    return this.cms.getBlog(slug);
  }

  @Public()
  @Get('guides')
  @ApiOperation({ summary: 'List buying guides' })
  guides() {
    return this.cms.listGuides();
  }

  @Public()
  @Get('banners')
  @ApiOperation({ summary: 'List active banners / hero slides' })
  banners() {
    return this.cms.listBanners();
  }

  @Public()
  @Get('navigation')
  @ApiOperation({ summary: 'Navigation / menu / footer from homepage layout' })
  navigation() {
    return this.cms.getNavigation();
  }
}

@ApiTags('marketing')
@ApiBearerAuth()
@Controller()
export class MarketingPublicController {
  constructor(
    private readonly coupons: CouponService,
    private readonly flags: FeatureFlagService,
    private readonly search: SearchMarketingService,
    private readonly recs: RecommendationService,
  ) {}

  @Post('coupons/validate')
  @ApiOperation({ summary: 'Validate coupon via RuleEngine' })
  validate(
    @CurrentUser() user: AuthUser,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.coupons.validate(user.sub, dto);
  }

  @Post('coupons/apply')
  @Idempotent()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ summary: 'Apply / redeem coupon (locked)' })
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyCouponDto) {
    return this.coupons.apply(user.sub, dto);
  }

  @Public()
  @Get('feature-flags')
  @ApiOperation({ summary: 'Evaluate feature flags for caller/anonymous' })
  featureFlags(@Req() req: { user?: AuthUser }) {
    return this.flags.listAndEvaluate(req.user?.sub);
  }

  @Public()
  @Get('recommendations')
  @ApiOperation({ summary: 'Product recommendations (rule-filtered, no ML)' })
  recommendations(
    @Query() query: RecommendationsQueryDto,
    @Req() req: { user?: AuthUser },
  ) {
    return this.recs.list(query.productId, req.user?.sub, query.type);
  }

  @Public()
  @Get('search/suggestions')
  @ApiOperation({ summary: 'Search suggestions / synonyms / boosts' })
  suggestions(@Query('q') q = '') {
    return this.search.suggestions(q);
  }
}
