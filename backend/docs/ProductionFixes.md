# Production Fixes — Phase K.1

Implemented 2026-07-31. No commerce feature changes.

| # | Blocker | Fix |
|---|---------|-----|
| 1 | Demo seeds on every deploy | Numbered `*_seed.sql` classified as demo; skipped unless `APPLY_DEMO_DATA=1` / `--demo-data` / `NODE_ENV=development`. Reference seeds in `database/sql/reference/`. |
| 2 | Re-apply migrations | Checksum skip + append-only `_prisma_migrations` (no DELETE). |
| 3 | Silent payment mock | Production/staging fails if mock implied or keys missing. |
| 4 | Silent shipping mock | Same. |
| 5 | Swagger on when unset | Prod default off; only explicit enable. |
| 6 | SMTP vs MAIL | Runtime prefers `SMTP_*` (MAIL_* still accepted as alias). |
| 7 | Webhook raw body | `rawBody: true`; controllers require `Buffer` raw body. |
| 8 | Checkout vs 30s timeout | `@TimeoutMs(150_000)` on checkout (> 120s saga). |
| 9 | DATABASE_URL fallback | Removed; required at config + validation. |
| 10 | Socket CORS `*` | Uses `CORS_ORIGINS` (never `*` in prod). |
| 11 | Hanging fetch | `fetchWithTimeout` + retries in Razorpay/Shiprocket. |
| 12 | hideErrorDetails | Wired for 5xx responses in HTTP filter. |
| 13 | Env ignore | `.env*` ignored except examples; `.env.production.example` added. |
| 14 | Deploy pipeline | migrate + reference seed before PM2; rollback trap. |
| 15 | Indexes | Documented gaps; no new migrations (schema locked). |
| 16 | CITEXT/INET | Documented intentional Prisma VarChar mapping (schema locked). |
| 17 | Rollback | Backup restore documented — no destructive SQL rollback. |

See also: MigrationSafety.md, DeploymentSafety.md, SecretManagement.md.
