#!/usr/bin/env node
/**
 * End-to-end: register → refresh → cart → wishlist → checkout → orders → logout.
 * Usage:
 *   BASE_URL=https://api.gdcd.online/api node postman/e2e-commerce.mjs
 *
 * Auth success is 200 OR 201 (Nest may return 201 Created on register).
 * Do not change backend auth contracts — this script accepts both.
 */
const BASE = (process.env.BASE_URL || 'https://api.gdcd.online/api').replace(/\/$/, '');
const VARIANT_ID = process.env.VARIANT_ID || '37000000-0000-0000-0000-000000000001';
const WAREHOUSE_ID = process.env.WAREHOUSE_ID || '40000000-0000-0000-0000-000000000001';
const SESSION = `e2e-${Date.now()}`;
const email = process.env.E2E_EMAIL || `e2e.${Date.now()}@example.com`;
const password = process.env.E2E_PASSWORD || 'SecurePass1!';

async function api(method, path, { token, body, headers } = {}) {
  const h = {
    Accept: 'application/json',
    'X-Session-Key': SESSION,
    ...(headers || {}),
  };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function ok2xx(status) {
  return status >= 200 && status < 300;
}

function authPayload(res) {
  return res.json?.data ?? res.json;
}

async function main() {
  console.log(`E2E against ${BASE}`);
  console.log(`user ${email}`);

  const brands = await api('GET', '/catalog/brands');
  assert(brands.status === 200, `brands ${brands.status}`);
  assert(
    Array.isArray(brands.json?.data) && brands.json.data.length > 0,
    'catalog empty — run seed-storefront.sh',
  );
  console.log('OK catalog seeded', brands.json.data.length, 'brands');

  const products = await api('GET', '/catalog/products?limit=5');
  assert(products.status === 200, `products ${products.status}`);
  assert((products.json?.data?.length ?? 0) > 0, 'products empty');
  console.log('OK products', products.json.data.length);

  const featured = await api('GET', '/catalog/products/featured');
  assert(featured.status === 200, `featured ${featured.status}`);
  console.log('OK featured');

  const refurbished = await api('GET', '/catalog/products/refurbished');
  assert(refurbished.status === 200, `refurbished ${refurbished.status}`);
  console.log('OK refurbished');

  const search = await api('GET', '/catalog/products/search?q=mac&limit=5');
  assert(search.status === 200, `search ${search.status}`);
  console.log('OK search');

  const detail = await api('GET', '/catalog/products/macbook-air-m2-13');
  assert(detail.status === 200, `product detail ${detail.status} ${JSON.stringify(detail.json)}`);
  const variantId =
    process.env.VARIANT_ID ||
    detail.json?.data?.variants?.[0]?.id ||
    VARIANT_ID;
  assert(variantId, 'no variant id on product detail');
  console.log('OK product detail', 'variant', variantId);

  const banners = await api('GET', '/banners');
  assert(banners.status === 200, `banners ${banners.status}`);
  console.log('OK banners', Array.isArray(banners.json?.data) ? banners.json.data.length : '?');

  const nav = await api('GET', '/navigation');
  assert(nav.status === 200, `navigation ${nav.status}`);
  console.log('OK navigation');

  // Register — Nest returns 201 Created with tokens (do not require 200)
  let auth = await api('POST', '/auth/register', {
    body: { email, password },
  });
  if (auth.status >= 400) {
    auth = await api('POST', '/auth/login', {
      body: { identifier: email, password },
    });
  }
  const authData = authPayload(auth);
  assert(
    ok2xx(auth.status) && authData?.accessToken && authData?.refreshToken,
    `auth failed ${auth.status} ${JSON.stringify(auth.json)}`,
  );
  let token = authData.accessToken;
  let refreshToken = authData.refreshToken;
  console.log('OK auth', auth.status);

  const me = await api('GET', '/auth/me', { token });
  assert(me.status === 200, `me ${me.status}`);
  console.log('OK me');

  const refreshed = await api('POST', '/auth/refresh', {
    body: { refreshToken },
  });
  const refreshData = authPayload(refreshed);
  assert(
    ok2xx(refreshed.status) && refreshData?.accessToken,
    `refresh failed ${refreshed.status} ${JSON.stringify(refreshed.json)}`,
  );
  token = refreshData.accessToken;
  refreshToken = refreshData.refreshToken ?? refreshToken;
  console.log('OK refresh');

  const add = await api('POST', `/cart/items?sessionKey=${SESSION}`, {
    token,
    body: { variantId, quantity: 1 },
  });
  assert(ok2xx(add.status), `add cart ${add.status} ${JSON.stringify(add.json)}`);
  console.log('OK cart add');

  const cart = await api('GET', `/cart?sessionKey=${SESSION}`, { token });
  assert(
    cart.status === 200 && (cart.json?.data?.items?.length ?? 0) >= 1,
    `cart empty ${JSON.stringify(cart.json)}`,
  );
  console.log('OK cart get', cart.json.data.items.length, 'items');

  const wish = await api('POST', '/wishlist/items', {
    token,
    body: { variantId },
  });
  assert(ok2xx(wish.status), `wishlist ${wish.status} ${JSON.stringify(wish.json)}`);
  console.log('OK wishlist add');

  const wl = await api('GET', '/wishlist', { token });
  assert(wl.status === 200, `wishlist get ${wl.status}`);
  console.log('OK wishlist get');

  const checkout = await api('POST', '/checkout', {
    token,
    headers: { 'Idempotency-Key': `e2e-checkout-${Date.now()}` },
    body: {
      sessionKey: SESSION,
      warehouseId: WAREHOUSE_ID,
      shipping: {
        fullName: 'E2E Tester',
        phone: '9876543210',
        line1: '12 Test Street',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
        country: 'India',
      },
    },
  });
  assert(
    ok2xx(checkout.status),
    `checkout ${checkout.status} ${JSON.stringify(checkout.json)}`,
  );
  const order = checkout.json?.data;
  console.log('OK checkout', order?.orderNumber || order?.id || JSON.stringify(order)?.slice(0, 120));

  const orders = await api('GET', '/orders', { token });
  assert(orders.status === 200, `orders ${orders.status}`);
  const list = orders.json?.data;
  assert(Array.isArray(list) && list.length >= 1, 'orders list empty');
  console.log('OK orders', list.length);

  const payments = await api('GET', '/payments/methods', { token });
  assert(ok2xx(payments.status) || payments.status === 401, `payments ${payments.status}`);
  console.log('OK payments methods', payments.status);

  const logout = await api('POST', '/auth/logout', {
    token,
    body: { refreshToken },
  });
  assert(ok2xx(logout.status) || logout.status === 204, `logout ${logout.status}`);
  console.log('OK logout', logout.status);

  console.log('\nE2E PASS');
}

main().catch((e) => {
  console.error('\nE2E FAIL:', e.message);
  process.exit(1);
});
