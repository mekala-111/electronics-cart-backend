import { DomainEvent } from '../../../shared/events/domain-event';

export class CouponAppliedEvent extends DomainEvent<{
  couponId: string;
  code: string;
  customerId?: string;
  discount: number;
}> {
  static readonly eventName = 'coupon.applied';
  readonly eventName = CouponAppliedEvent.eventName;
}

export class CouponRedeemedEvent extends DomainEvent<{
  couponId: string;
  usageId: string;
  customerId?: string;
  orderId?: string;
}> {
  static readonly eventName = 'coupon.redeemed';
  readonly eventName = CouponRedeemedEvent.eventName;
}

export class CampaignStartedEvent extends DomainEvent<{
  campaignId: string;
  channel: string;
}> {
  static readonly eventName = 'campaign.started';
  readonly eventName = CampaignStartedEvent.eventName;
}

export class CampaignCompletedEvent extends DomainEvent<{
  campaignId: string;
  channel: string;
}> {
  static readonly eventName = 'campaign.completed';
  readonly eventName = CampaignCompletedEvent.eventName;
}

export class LoyaltyPointsEarnedEvent extends DomainEvent<{
  accountId: string;
  customerId: string;
  points: number;
}> {
  static readonly eventName = 'loyalty.points.earned';
  readonly eventName = LoyaltyPointsEarnedEvent.eventName;
}

export class LoyaltyPointsRedeemedEvent extends DomainEvent<{
  accountId: string;
  customerId: string;
  points: number;
}> {
  static readonly eventName = 'loyalty.points.redeemed';
  readonly eventName = LoyaltyPointsRedeemedEvent.eventName;
}

export class ReferralCreatedEvent extends DomainEvent<{
  rewardId: string;
  programId: string;
  referrerId: string;
  refereeId: string;
}> {
  static readonly eventName = 'referral.created';
  readonly eventName = ReferralCreatedEvent.eventName;
}

export class FeatureFlagEvaluatedEvent extends DomainEvent<{
  flagCode: string;
  enabled: boolean;
  customerId?: string;
}> {
  static readonly eventName = 'feature_flag.evaluated';
  readonly eventName = FeatureFlagEvaluatedEvent.eventName;
}

export class RecommendationGeneratedEvent extends DomainEvent<{
  productId: string;
  count: number;
}> {
  static readonly eventName = 'recommendation.generated';
  readonly eventName = RecommendationGeneratedEvent.eventName;
}

export class SearchBoostAppliedEvent extends DomainEvent<{
  keyword: string;
  boost: number;
}> {
  static readonly eventName = 'search.boost.applied';
  readonly eventName = SearchBoostAppliedEvent.eventName;
}

export class AbTestExposureEvent extends DomainEvent<{
  testId: string;
  variantId: string;
  customerId?: string;
}> {
  static readonly eventName = 'ab_test.exposure';
  readonly eventName = AbTestExposureEvent.eventName;
}
