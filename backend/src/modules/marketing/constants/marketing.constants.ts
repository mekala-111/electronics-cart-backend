export const CMS_PERMISSIONS = {
  READ: 'cms.read',
  WRITE: 'cms.write',
} as const;

export const MARKETING_PERMISSIONS = {
  READ: 'marketing.read',
  WRITE: 'marketing.write',
} as const;

export const MARKETING_CACHE = {
  TTL: 60,
  page: (slug: string) => `cms:page:${slug}`,
  nav: () => 'cms:navigation',
  banners: () => 'cms:banners',
  flags: () => 'mkt:flags',
  coupon: (code: string) => `mkt:coupon:${code}`,
  recs: (productId: string) => `mkt:recs:${productId}`,
  suggestions: (q: string) => `mkt:suggest:${q.toLowerCase()}`,
} as const;

export const MARKETING_JOBS = {
  CAMPAIGN_SCHEDULER: 'marketing.campaign.scheduler',
  EMAIL_DELIVERY: 'marketing.email.delivery',
  SMS_DELIVERY: 'marketing.sms.delivery',
  PUSH_DELIVERY: 'marketing.push.delivery',
  SEARCH_ANALYTICS: 'marketing.search.analytics',
  REC_REFRESH: 'marketing.rec.refresh',
  COUPON_EXPIRY: 'marketing.coupon.expiry',
  LOYALTY_EXPIRY: 'marketing.loyalty.expiry',
  REFERRAL_REWARDS: 'marketing.referral.rewards',
} as const;
