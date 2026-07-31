# Changelog

## [1.1.0] — 2026-07-31

### Production readiness (Phase K.1)

- Checksum-safe, append-only migration runner
- Demo seeds excluded from production; reference seeds for roles/gateways/partners
- Fail-closed payment/shipping mock gates in production
- Swagger disabled by default in production
- Unified SMTP_* mail configuration
- Nest `rawBody` for Razorpay/Shiprocket webhook HMAC
- Checkout HTTP timeout aligned above saga budget (150s)
- Outbound fetch timeouts + retries
- Socket CORS from `CORS_ORIGINS` (no `*`)
- Deploy pipeline: migrate → reference seed → PM2 → health → rollback on failure
- Git preparation docs and ignore rules (repo init pending approval)

## [1.0.0] — 2026-07

- Database v1.0 locked (phases 1–9, SQL 001–045)
- NestJS enterprise backend modules complete
