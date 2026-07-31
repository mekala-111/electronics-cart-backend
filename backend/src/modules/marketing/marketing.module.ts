import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { LockModule } from '../../shared/lock/lock.module';
import {
  AdminCmsController,
  AdminMarketingController,
} from './controllers/admin-marketing.controller';
import {
  CmsPublicController,
  MarketingPublicController,
} from './controllers/marketing.controller';
import { MarketingEventPublisher } from './events/marketing-event.publisher';
import { MarketingRepository } from './repositories/marketing.repository';
import { CmsService } from './services/cms.service';
import { CouponService } from './services/coupon.service';
import {
  AbTestService,
  CampaignService,
  FeatureFlagService,
  LoyaltyService,
  MarketingDashboardService,
  RecommendationService,
  ReferralService,
  SearchMarketingService,
} from './services/growth.services';
import { MarketingBootstrapService } from './services/marketing-bootstrap.service';
import { MarketingCacheService } from './services/marketing-cache.service';
import { MarketingWorker } from './workers/marketing.worker';

@Module({
  imports: [PrismaModule, CacheModule, LockModule],
  controllers: [
    CmsPublicController,
    MarketingPublicController,
    AdminCmsController,
    AdminMarketingController,
  ],
  providers: [
    MarketingRepository,
    MarketingCacheService,
    MarketingEventPublisher,
    CmsService,
    CouponService,
    FeatureFlagService,
    LoyaltyService,
    ReferralService,
    CampaignService,
    SearchMarketingService,
    RecommendationService,
    AbTestService,
    MarketingDashboardService,
    MarketingBootstrapService,
    MarketingWorker,
  ],
  exports: [CouponService, FeatureFlagService, CmsService],
})
export class MarketingModule {}
