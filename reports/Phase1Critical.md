# Phase 1 Critical — Backend Status

Date: 2026-08-02

## Done in repo

| Item | Status | Notes |
|------|--------|-------|
| Redis cache fail-open | **Code complete** | `CacheService.get/set/del/getOrSet` degrade on Redis errors; `enableOfflineQueue: false` |
| Unit coverage | Spec added | `cache.service.spec.ts` (needs `pnpm install` for jest/typescript locally) |
| Storefront reference seeds | **Ready** | `sql/reference/005–007_*` + `scripts/seed-storefront.sh` |
| API status sweep | **63–90 checks** | `postman/verify-apis.mjs` — live: **0 failures** (pre-seed) |
| E2E script | **Ready, blocked on seed** | `postman/e2e-commerce.mjs` fails until catalog seed applied |

## Live API (`api.gdcd.online`) before seed

- Health / DB / Redis: OK
- Catalog list endpoints: 200 with **empty arrays**
- Product by seed UUID: **404** (not seeded)
- Cart guest GET: 200; add without stock/variant: 400
- Auth-gated routes: 401; admin: 403

## Required on VPS (one shot)

```bash
cd /www/wwwroot/electronics-cart-backend
git pull --ff-only
set -a && source backend/.env && set +a
chmod +x database/scripts/seed-storefront.sh
./database/scripts/seed-storefront.sh
cd backend && ./deployment/deploy.sh   # ships CacheService fail-open

# verify
BASE_URL=https://api.gdcd.online/api node postman/verify-apis.mjs
BASE_URL=https://api.gdcd.online/api node postman/e2e-commerce.mjs
```

## Seed contents

- Brands, categories, MacBook Air product + variant
- Hyderabad warehouse + inventory qty 25
- Homepage banners, featured collection, primary navigation
