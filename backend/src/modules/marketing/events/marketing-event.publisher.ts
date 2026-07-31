import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events/event-publisher';
import * as E from './marketing.events';

@Injectable()
export class MarketingEventPublisher {
  constructor(private readonly publisher: EventPublisher) {}

  couponApplied(e: E.CouponAppliedEvent) {
    void this.publisher.publish(e);
  }
  couponRedeemed(e: E.CouponRedeemedEvent) {
    void this.publisher.publish(e);
  }
  campaignStarted(e: E.CampaignStartedEvent) {
    void this.publisher.publish(e);
  }
  campaignCompleted(e: E.CampaignCompletedEvent) {
    void this.publisher.publish(e);
  }
  loyaltyEarned(e: E.LoyaltyPointsEarnedEvent) {
    void this.publisher.publish(e);
  }
  loyaltyRedeemed(e: E.LoyaltyPointsRedeemedEvent) {
    void this.publisher.publish(e);
  }
  referralCreated(e: E.ReferralCreatedEvent) {
    void this.publisher.publish(e);
  }
  flagEvaluated(e: E.FeatureFlagEvaluatedEvent) {
    void this.publisher.publish(e);
  }
  recommendationGenerated(e: E.RecommendationGeneratedEvent) {
    void this.publisher.publish(e);
  }
  searchBoost(e: E.SearchBoostAppliedEvent) {
    void this.publisher.publish(e);
  }
  abExposure(e: E.AbTestExposureEvent) {
    void this.publisher.publish(e);
  }
}
