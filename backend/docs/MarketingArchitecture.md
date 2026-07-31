# Marketing Architecture

Module: `backend/src/modules/marketing/`

Uses locked Phase-8 tables only. Shared `RuleEngine` for eligibility (coupons, flags, rewards, recommendation conditions). Redis cache, BullMQ `marketing` queue, `LockService`, domain events, `audit_logs` (no `marketing_audit_logs` table).

## Schema mapping

| Spec name | Locked model |
|---|---|
| coupon_redemptions | `CouponUsage` |
| cms_navigation / menus | `HomepageLayout` + section_type navigation/footer |
| cms_popups / announcements | `Banner` + `BannerGroup.placement` |
| seo_pages | `SeoMetadata` |
| recommendation_rules | `ProductRecommendation` + conditions in `audit_logs` |
| marketing_audit_logs | `AuditLog` |
| campaigns | `EmailCampaign` / `SmsCampaign` / `PushCampaign` / `NotificationCampaign` |

## Permissions

Bootstrapped: `cms.read|write`, `marketing.read|write` for admin roles.
