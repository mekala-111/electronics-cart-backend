#!/usr/bin/env node
/**
 * Smoke-check Postman-mapped storefront/admin routes against a live API.
 * Usage: BASE_URL=https://api.gdcd.online/api node postman/verify-apis.mjs
 *
 * Exit 0 only if every check matches an expected status (or status set).
 */
const BASE = (process.env.BASE_URL || 'https://api.gdcd.online/api').replace(/\/$/, '');

const VARIANT_ID = process.env.VARIANT_ID || '37000000-0000-0000-0000-000000000001';
const PRODUCT_ID = process.env.PRODUCT_ID || '36000000-0000-0000-0000-000000000001';
const WAREHOUSE_ID = process.env.WAREHOUSE_ID || '40000000-0000-0000-0000-000000000001';
const SESSION = process.env.SESSION_KEY || `verify-${Date.now()}`;

/** @type {Array<{name:string, method?:string, path:string, body?:unknown, auth?:boolean, expect:number|number[], headers?:Record<string,string>}>} */
const CHECKS = [];

function add(name, method, path, expect, opts = {}) {
  CHECKS.push({ name, method, path, expect, ...opts });
}

// Health
add('health', 'GET', '/health', 200);
add('health live', 'GET', '/health/live', 200);
add('health ready', 'GET', '/health/ready', [200, 503]);
add('health db', 'GET', '/health/db', [200, 503]);
add('health redis', 'GET', '/health/redis', [200, 503]);

// Auth public
add('register validation', 'POST', '/auth/register', 400, { body: {} });
add('login validation', 'POST', '/auth/login', 400, { body: {} });
add('refresh validation', 'POST', '/auth/refresh', 400, { body: {} });
add('forgot password', 'POST', '/auth/forgot-password', [200, 201, 400], {
  body: { identifier: 'nobody@example.com' },
});
add('send otp validation', 'POST', '/auth/send-otp', 400, { body: {} });

// Catalog public
add('brands', 'GET', '/catalog/brands', 200);
add('categories', 'GET', '/catalog/categories', 200);
add('category tree', 'GET', '/catalog/categories/tree', 200);
add('collections', 'GET', '/catalog/collections', 200);
add('attributes', 'GET', '/catalog/attributes', 200);
add('products', 'GET', '/catalog/products?page=1&limit=5', 200);
add('search', 'GET', '/catalog/products/search?q=mac&page=1&limit=5', 200);
add('featured', 'GET', '/catalog/products/featured', 200);
add('newest', 'GET', '/catalog/products/new', 200);
add('refurbished', 'GET', '/catalog/products/refurbished', 200);
add('product', 'GET', `/catalog/products/${PRODUCT_ID}`, [200, 404]);
add('product specs', 'GET', `/catalog/products/${PRODUCT_ID}/specifications`, [200, 404]);
add('product media', 'GET', `/catalog/products/${PRODUCT_ID}/media`, [200, 404]);
add('product videos', 'GET', `/catalog/products/${PRODUCT_ID}/videos`, [200, 404]);
add('product questions', 'GET', `/catalog/products/${PRODUCT_ID}/questions`, [200, 404, 500]);

// Cart guest
add('get cart', 'GET', `/cart?sessionKey=${SESSION}`, 200, {
  headers: { 'X-Session-Key': SESSION },
});
add('add cart item', 'POST', `/cart/items?sessionKey=${SESSION}`, [200, 400, 404], {
  body: { variantId: VARIANT_ID, quantity: 1 },
  headers: { 'X-Session-Key': SESSION },
});

// Marketing
add('cms about', 'GET', '/cms/pages/about', [200, 404]);
add('blog', 'GET', '/blog', 200);
add('banners', 'GET', '/banners', 200);
add('navigation', 'GET', '/navigation', 200);
add('feature flags', 'GET', '/feature-flags', 200);
add('recommendations', 'GET', `/recommendations?productId=${PRODUCT_ID}`, [200, 400, 404]);
add('search suggestions', 'GET', '/search/suggestions?q=mac', 200);
add('validate coupon', 'POST', '/coupons/validate', [200, 400, 401], {
  body: { code: 'SAVE10', cartTotal: 1000 },
});

// Shipping / inventory public-ish
add('shipping methods', 'GET', '/shipping/methods', [200, 401]);
add('shipping rates', 'GET', '/shipping/rates?destinationPincode=500001', [200, 400, 401]);
add('shipping estimate', 'POST', '/shipping/estimate', [200, 400, 401], {
  body: { destinationPincode: '500001', weightKg: 1 },
});
add('delivery slots', 'GET', '/shipping/delivery-slots', [200, 401]);
add('pickup points', 'GET', '/shipping/pickup-points', [200, 401]);
add('inventory', 'GET', '/inventory', [200, 401]);
add('warehouses', 'GET', '/inventory/warehouses', [200, 401]);
add('stock', 'GET', `/inventory/stock?variantId=${VARIANT_ID}`, [200, 400, 401]);
add('cancellation reasons', 'GET', '/cancellation-reasons', 200);

// Warranty
add('warranty plans', 'GET', '/warranty/plans', [200, 401]);
add('warranty check', 'GET', '/warranty/check/SERIAL123', [200, 404, 401]);

// Extra Postman-mapped routes (status smoke)
add('health storage', 'GET', '/health/storage', [200, 503]);
add('health queues', 'GET', '/health/queues', [200, 503]);
add('verify email validation', 'POST', '/auth/verify-email', 400, { body: {} });
add('resend verification validation', 'POST', '/auth/resend-verification', 400, { body: {} });
add('reset password validation', 'POST', '/auth/reset-password', 400, { body: {} });
add('verify otp validation', 'POST', '/auth/verify-otp', 400, { body: {} });
add('logout unauth', 'POST', '/auth/logout', 401, { body: { refreshToken: 'x' } });
add('change password unauth', 'POST', '/auth/change-password', 401, { body: {} });
add('profile unauth', 'PATCH', '/auth/profile', 401, { body: { mobile: '+919876543210' } });
add('cart update missing', 'PATCH', `/cart/items/00000000-0000-0000-0000-000000000099?sessionKey=${SESSION}`, [400, 404], {
  body: { quantity: 1 },
  headers: { 'X-Session-Key': SESSION },
});
add('cart remove missing', 'DELETE', `/cart/items/00000000-0000-0000-0000-000000000099?sessionKey=${SESSION}`, [400, 404], {
  headers: { 'X-Session-Key': SESSION },
});
add('guides', 'GET', '/guides', [200, 404]);
add('apply coupon unauth', 'POST', '/coupons/apply', [200, 400, 401], { body: { code: 'SAVE10' } });
add('payments create unauth', 'POST', '/payments/create', 401, { body: { orderId: PRODUCT_ID } });
add('payment by order unauth', 'GET', `/payments/order/${PRODUCT_ID}`, 401);
add('shipments unauth', 'GET', '/shipping/shipments', [401, 404]);
add('serial inventory', 'GET', '/inventory/serial/SERIAL123', [200, 404, 401]);
add('warehouse availability', 'GET', `/inventory/warehouse-availability?variantId=${VARIANT_ID}`, [200, 400, 401]);
add('analytics reports unauth', 'GET', '/analytics/reports', 401);
add('analytics funnels unauth', 'GET', '/analytics/funnels', 401);
add('analytics trends unauth', 'GET', '/analytics/trends', 401);
add('analytics cohorts unauth', 'GET', '/analytics/cohorts', 401);
add('analytics ltv unauth', 'GET', '/analytics/ltv', 401);
add('analytics rfm unauth', 'GET', '/analytics/rfm', 401);
add('admin analytics refresh unauth', 'POST', '/admin/analytics/dashboard/refresh', [401, 403], { body: {} });
add('warranty register unauth', 'POST', '/warranty/register', 401, { body: { serial: 'S1', productId: PRODUCT_ID } });
add('rma unauth', 'POST', '/warranty/rma', 401, { body: {} });
add('claims unauth', 'POST', '/warranty/claims', 401, { body: {} });

// Auth-required without token → 401
const AUTH_GETS = [
  ['me', '/auth/me'],
  ['sessions', '/auth/sessions'],
  ['wishlist', '/wishlist'],
  ['addresses', '/addresses'],
  ['orders', '/orders'],
  ['payment methods', '/payments/methods'],
  ['payment history', '/payments/history'],
  ['saved methods', '/payments/saved-methods'],
  ['analytics dashboard', '/analytics/dashboard'],
  ['analytics kpis', '/analytics/kpis'],
  ['service tickets', '/service/tickets'],
  ['service appointments', '/service/appointments'],
];
for (const [name, path] of AUTH_GETS) {
  add(`${name} unauth`, 'GET', path, 401);
}

// Admin guards may return 401 or 403 without a bearer token
const ADMIN_GETS = [
  ['admin orders', '/admin/orders'],
  ['admin products', '/admin/catalog/products'],
  ['admin low stock', '/admin/inventory/low-stock-alerts'],
  ['admin payments', '/admin/payments'],
  ['admin marketing', '/admin/marketing/dashboard'],
];
for (const [name, path] of ADMIN_GETS) {
  add(`${name} unauth`, 'GET', path, [401, 403]);
}

async function request(check, token) {
  const headers = {
    Accept: 'application/json',
    ...(check.headers || {}),
  };
  if (check.body !== undefined) headers['Content-Type'] = 'application/json';
  if (check.auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${check.path}`, {
    method: check.method || 'GET',
    headers,
    body: check.body !== undefined ? JSON.stringify(check.body) : undefined,
  });
  return res.status;
}

function okStatus(got, expect) {
  const list = Array.isArray(expect) ? expect : [expect];
  return list.includes(got);
}

async function main() {
  let pass = 0;
  let fail = 0;
  const failures = [];

  // Optional login for a second pass of auth routes
  let token = process.env.ACCESS_TOKEN || '';
  if (!token && process.env.EMAIL && process.env.PASSWORD) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        identifier: process.env.EMAIL,
        password: process.env.PASSWORD,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      token = json?.data?.accessToken || '';
    }
  }

  for (const check of CHECKS) {
    try {
      const status = await request(check, token);
      if (okStatus(status, check.expect)) {
        pass += 1;
        console.log(`OK  ${status} ${check.method} ${check.path} — ${check.name}`);
      } else {
        fail += 1;
        failures.push(check);
        console.log(
          `FAIL ${status} (want ${JSON.stringify(check.expect)}) ${check.method} ${check.path} — ${check.name}`,
        );
      }
    } catch (err) {
      fail += 1;
      failures.push(check);
      console.log(`ERR  ${check.name}: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Authenticated extras when token present
  if (token) {
    const authChecks = [
      { name: 'me auth', method: 'GET', path: '/auth/me', expect: 200 },
      { name: 'wishlist auth', method: 'GET', path: '/wishlist', expect: 200 },
      {
        name: 'wishlist add',
        method: 'POST',
        path: '/wishlist/items',
        body: { variantId: VARIANT_ID },
        expect: [200, 400, 404],
      },
      { name: 'orders auth', method: 'GET', path: '/orders', expect: 200 },
      {
        name: 'checkout missing fields',
        method: 'POST',
        path: '/checkout',
        body: {},
        expect: [400],
        headers: { 'Idempotency-Key': `verify-${Date.now()}` },
      },
    ];
    for (const check of authChecks) {
      const status = await request({ ...check, auth: true }, token);
      if (okStatus(status, check.expect)) {
        pass += 1;
        console.log(`OK  ${status} ${check.method} ${check.path} — ${check.name}`);
      } else {
        fail += 1;
        console.log(
          `FAIL ${status} (want ${JSON.stringify(check.expect)}) ${check.method} ${check.path} — ${check.name}`,
        );
      }
    }
  }

  console.log(`\n${pass} passed, ${fail} failed, ${CHECKS.length}+ checks against ${BASE}`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
