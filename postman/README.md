# Postman — Electronics Cart API

## Import

1. Open Postman → **Import**
2. Add:
   - `Electronics-Cart-API.postman_collection.json`
   - `Electronics-Cart-Production.postman_environment.json` (or Local)
3. Select the environment in the top-right dropdown

## Environments

| Environment | `baseUrl` |
|-------------|-----------|
| Production | `https://api.gdcd.online/api` |
| Local | `http://127.0.0.1:3051/api` |

## Quick start

1. Set `email` / `password` collection variables (or environment)
2. Run **Auth → Register** (or **Login** if the user exists)
3. `accessToken` / `refreshToken` are saved automatically from the response
4. Authenticated requests use Bearer `{{accessToken}}`
5. Guest cart uses `sessionKey` + `X-Session-Key` header

## Verification scripts

```bash
# Status-code sweep (~85 mapped routes)
BASE_URL=https://api.gdcd.online/api node postman/verify-apis.mjs

# With auth extras
BASE_URL=https://api.gdcd.online/api EMAIL=you@example.com PASSWORD='SecurePass1!' node postman/verify-apis.mjs

# Cart → wishlist → checkout → orders (needs storefront seeds)
BASE_URL=https://api.gdcd.online/api node postman/e2e-commerce.mjs
```

## Seed storefront data (prod/local)

```bash
cd database
DATABASE_URL='postgresql://...' ./scripts/seed-storefront.sh
```

On the VPS after `git pull`:

```bash
cd /www/wwwroot/electronics-cart-backend
git pull --ff-only
set -a && source backend/.env && set +a
./database/scripts/seed-storefront.sh
cd backend && ./deployment/deploy.sh
```

## Notes

- Responses use Nest envelope: `{ success, data, meta?, message?, code? }`
- Cart is public with `sessionKey`; wishlist / orders / checkout need auth
- Password must be strong: upper, lower, digit, special, min 8 chars
