# Release Candidate Checklist — Backend v1.1

## Gates

- [ ] `cd backend && pnpm install --frozen-lockfile && pnpm lint && pnpm test && pnpm run build`
- [ ] `cd database && APPLY_DEMO_DATA=1 bash scripts/verify-clean.sh` (or `verify-all.sh`)
- [ ] `APPLY_DEMO_DATA=0 NODE_ENV=production bash scripts/verify-production.sh`
- [ ] Confirm demo seeds skipped in production deploy log
- [ ] Confirm payment/shipping mock rejected with empty keys under `NODE_ENV=production`
- [ ] Confirm Swagger disabled when `SWAGGER_ENABLED` unset in production
- [ ] Webhook rawBody smoke (signature verify against Buffer)
- [ ] Checkout endpoint timeout ≥ 150s
- [ ] Secret audit clean; `.env` not tracked
- [ ] Docs under `backend/docs/` reviewed
- [ ] **Approval** before `git init` / first push

## Index / Prisma notes (no schema change this phase)

- High-traffic FK gaps remain documented in `database/reports/IndexReport.md` (e.g. `orders.cart_id`). Add via future `046+` after approval.
- SQL uses `CITEXT` / `INET`; Prisma maps `VarChar` intentionally until a typed alignment migration is approved. Drift gate still requires table/enum parity.
