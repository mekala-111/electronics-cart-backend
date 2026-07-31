# Auth API Reference

Base path: `/auth`

Public routes skip Bearer token. Protected routes require `Authorization: Bearer <accessToken>`.

## Endpoints

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register with email and/or mobile + password |
| POST | `/auth/login` | Public | Login with email or mobile identifier |
| POST | `/auth/refresh` | Public | Rotate refresh token |
| POST | `/auth/logout` | JWT | Revoke refresh token and/or session |
| GET | `/auth/me` | JWT | Current user profile, roles, permissions |
| PATCH | `/auth/profile` | JWT | Update `mobile` only |
| POST | `/auth/change-password` | JWT | Change password; optional keep current session |
| POST | `/auth/forgot-password` | Public | Generic response; sends reset OTP if user exists |
| POST | `/auth/reset-password` | Public | Reset password with OTP |
| POST | `/auth/verify-email` | Public | Verify email with OTP |
| POST | `/auth/resend-verification` | Public | Resend email verification OTP |
| POST | `/auth/send-otp` | Public | Issue OTP for configured purpose/channel |
| POST | `/auth/verify-otp` | Public | Verify OTP |
| GET | `/auth/sessions` | JWT | List active sessions |
| DELETE | `/auth/sessions/:id` | JWT | Revoke session by ID |
| DELETE | `/auth/sessions` | JWT | Revoke all sessions except current |

## Error codes

Auth-specific codes live in `ErrorCodes` (`AUTH_*` prefix), e.g. `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_LOCKED`, `AUTH_TOKEN_REUSED`, `AUTH_OTP_INVALID`.

## Profile limitations

The `User` model has no `name`, `avatar`, `timezone`, or `language` fields. Profile updates are limited to `mobile` until a dedicated customer profile module is introduced.


# Catalog API Reference

Base path: `/catalog` (public) and `/admin/catalog` (admin).

Public routes are `@Public()`. Admin routes require Bearer JWT, roles `admin|super_admin`, permission `catalog.write`, and `Idempotency-Key` on create endpoints.

## Public

| Method | Route | Description |
| --- | --- | --- |
| GET | `/catalog/brands` | Active brands |
| GET | `/catalog/categories` | Flat categories |
| GET | `/catalog/categories/tree` | Nested tree |
| GET | `/catalog/collections` | Collections |
| GET | `/catalog/products` | List / filter |
| GET | `/catalog/products/search` | Search |
| GET | `/catalog/products/featured` | Featured |
| GET | `/catalog/products/new` | New arrivals |
| GET | `/catalog/products/refurbished` | Refurbished |
| GET | `/catalog/products/:idOrSlug` | Detail (UUID or slug) |
| GET | `/catalog/products/:id/specifications` | Specs |
| GET | `/catalog/products/:id/media` | Media |
| GET | `/catalog/products/:id/videos` | Videos (media kind=video) |
| GET | `/catalog/products/:id/questions` | Q&A (empty until schema adds table) |

## Admin (prefix `/admin/catalog`)

CRUD for brands, categories, collections, products, variants, media, specifications, badges, SEO, buying guides. See Swagger `/docs` tag `catalog-admin`.

Full notes: [CatalogArchitecture.md](./CatalogArchitecture.md), [SearchArchitecture.md](./SearchArchitecture.md).

# Inventory API Reference

Public base: `/inventory`. Admin: `/admin/inventory` (JWT + `inventory.write`, Idempotency-Key on writes).

| Method | Route | Description |
| --- | --- | --- |
| GET | `/inventory` | Inventory rows |
| GET | `/inventory/stock?warehouseId&variantId` | Stock summary |
| GET | `/inventory/warehouse-availability?variantId` | Cross-warehouse availability |
| GET | `/inventory/serial/:serial` | Serial lookup |
| POST | `/admin/inventory/reserve` | Reserve stock |
| POST | `/admin/inventory/reservations/:id/release` | Release |
| POST | `/admin/inventory/adjustments` | Adjust |
| POST | `/admin/inventory/goods-receipts` | Post GRN |
| POST | `/admin/inventory/transfers` | Transfer |
| POST | `/admin/inventory/purchase-orders` | Create PO |

Docs: [InventoryArchitecture.md](./InventoryArchitecture.md).

# Orders API Reference

Public/customer: cart, wishlist, checkout, orders. Admin: `/admin/orders`.

Checkout requires Bearer + `Idempotency-Key`. Saga: draft → reserve → create/authorize/capture payment → confirm.

See [OrdersArchitecture.md](./OrdersArchitecture.md), [CheckoutFlow.md](./CheckoutFlow.md).

# Payments API Reference

JWT required (except Razorpay webhook). Permissions: `payments.read` / `payments.write` (admin).

| Method | Path | Notes |
|---|---|---|
| POST | `/api/payments/create` | Idempotent |
| POST | `/api/payments/:id/authorize` | |
| POST | `/api/payments/:id/capture` | Idempotent |
| POST | `/api/payments/:id/cancel` | Idempotent |
| GET | `/api/payments/:id` | Owner only |
| GET | `/api/payments/order/:orderId` | Owner only |
| POST | `/api/payments/:id/refund` | Full/partial |
| GET | `/api/payments/:id/refunds` | |
| GET | `/api/payments/methods` | |
| GET | `/api/payments/history` | |
| POST | `/api/payments/webhooks/razorpay` | Public + signature |
| POST | `/api/payments/:id/retry` | Idempotent |

Admin: `/api/admin/payments/*` (settlements, reconciliation, disputes, capture, refund).

See [PaymentsArchitecture.md](./PaymentsArchitecture.md), [WebhookFlow.md](./WebhookFlow.md).

# Shipping API Reference

JWT required (except Shiprocket webhook). Permissions: `shipping.read` / `shipping.write`.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/shipping/methods` | Services |
| GET | `/api/shipping/rates` | Quotes |
| POST | `/api/shipping/estimate` | Weight/zone/COD |
| POST | `/api/shipping/shipments` | Idempotent |
| GET | `/api/shipping/shipments/:id` | |
| GET | `/api/shipping/shipments/:id/tracking` | |
| GET | `/api/shipping/delivery-slots` | |
| GET | `/api/shipping/pickup-points` | |
| POST | `/api/shipping/webhooks/shiprocket` | Public + signature |

Admin: `/api/admin/shipping/*` (labels, pickups, status, reverse, RTO, rates, carriers, logs).

See [ShippingArchitecture.md](./ShippingArchitecture.md).

# Warranty & Service API Reference

JWT required (except public plan/serial check). Admin: roles `admin|super_admin` + `warranty.*` / `service.*`. Idempotency-Key on mutating writes.

## Public / customer

| Method | Path | Notes |
|---|---|---|
| GET | `/api/warranty/plans` | Public |
| GET | `/api/warranty/check/:serial` | Public |
| POST | `/api/warranty/register` | Idempotent |
| POST | `/api/warranty/claims` | Idempotent |
| GET | `/api/warranty/claims/:id` | Owner |
| POST | `/api/warranty/rma` | Idempotent |
| GET | `/api/service/tickets` | Owner list |
| POST | `/api/service/tickets` | Idempotent |
| GET | `/api/service/jobs/:id` | Repair detail |
| GET | `/api/service/appointments` | Ticket-based slots |

## Admin

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/warranty/plans` | |
| PATCH | `/api/admin/warranty/claims/:id` | CaseManager transition |
| POST | `/api/admin/warranty/extend` | Extended warranty |
| POST | `/api/admin/warranty/transfer` | Ownership transfer |
| PATCH | `/api/admin/warranty/rma/:id` | RMA transition |
| POST | `/api/admin/warranty/rma/:id/refund` | Payments saga |
| POST | `/api/admin/service/assign` | Technician |
| POST | `/api/admin/service/jobs` | Create repair |
| PATCH | `/api/admin/service/jobs/:id` | Repair status |
| POST | `/api/admin/service/diagnostics` | |
| POST | `/api/admin/service/loan-devices` | Idempotent |
| POST | `/api/admin/service/spare-parts` | Inventory reserve |
| GET | `/api/admin/service/dashboard` | Counters |

Docs: [WarrantyArchitecture.md](./WarrantyArchitecture.md), [WarrantyClaimFlow.md](./WarrantyClaimFlow.md), [RMAArchitecture.md](./RMAArchitecture.md), [RepairWorkflow.md](./RepairWorkflow.md), [CaseManagementIntegration.md](./CaseManagementIntegration.md).

# Marketing & CMS API Reference

Admin: `cms.*` / `marketing.*`. Coupons apply / campaign launch / referral / loyalty redeem are idempotent + locked.

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/api/cms/pages/:slug` | Published page |
| GET | `/api/blog` | |
| GET | `/api/blog/:slug` | |
| GET | `/api/guides` | Buying guides |
| GET | `/api/banners` | |
| GET | `/api/navigation` | Layout menus |
| POST | `/api/coupons/validate` | JWT + RuleEngine |
| POST | `/api/coupons/apply` | Idempotent |
| GET | `/api/feature-flags` | Public (optional JWT) |
| GET | `/api/recommendations` | |
| GET | `/api/search/suggestions?q=` | |

## Admin

| Method | Path |
|---|---|
| POST/PATCH | `/api/admin/cms/pages` |
| POST | `/api/admin/banners`, `/popups`, `/blogs` |
| POST | `/api/admin/campaigns`, `/coupons`, `/loyalty`, `/referrals` |
| POST | `/api/admin/feature-flags`, `/search`, `/recommendations`, `/ab-tests` |
| GET | `/api/admin/marketing/dashboard` |

Docs: [MarketingArchitecture.md](./MarketingArchitecture.md), [CouponEngine.md](./CouponEngine.md), [FeatureFlags.md](./FeatureFlags.md).

# Analytics & Reporting API Reference

JWT + permissions `analytics.read|write`, `report.read|write`. Admin routes require `admin|super_admin`. Writes use `Idempotency-Key`.

## Read

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/analytics/dashboard` | Domain dashboards (`?code=`) |
| GET | `/api/analytics/kpis` | KPI snapshots |
| GET | `/api/analytics/reports` | Saved reports |
| GET | `/api/analytics/funnels` | Funnel + drop-off |
| GET | `/api/analytics/trends` | Domain trends |
| GET | `/api/analytics/cohorts` | Cohort analysis |
| GET | `/api/analytics/ltv` | Customer LTV |
| GET | `/api/analytics/rfm` | RFM segments |

## Admin

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/admin/analytics/reports` | Create report or enqueue export |
| POST | `/api/admin/analytics/schedules` | Schedule report |
| POST | `/api/admin/analytics/alerts` | Create AlertRule (RuleEngine) |
| POST | `/api/admin/analytics/kpis` | Upsert / refresh KPIs |
| PATCH | `/api/admin/analytics/dashboard` | Configure layout |
| POST | `/api/admin/analytics/dashboard/refresh` | Refresh + lock |
| GET | `/api/admin/analytics/system` | System metrics snapshot |

Docs: [AnalyticsArchitecture.md](./AnalyticsArchitecture.md), [AnalyticsAPI.md](./AnalyticsAPI.md), [KPIEngine.md](./KPIEngine.md), [AlertEngine.md](./AlertEngine.md), [MetricsConsumption.md](./MetricsConsumption.md).
