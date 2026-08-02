#!/usr/bin/env node
/**
 * End-to-end: register → cart → wishlist → checkout → orders.
 * Usage:
 *   BASE_URL=https://api.gdcd.online/api node postman/e2e-commerce.mjs
 *
 * Seeded IDs (override via env):
 *   VARIANT_ID, WAREHOUSE_ID
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

async function main() {
  console.log(`E2E against ${BASE}`);
  console.log(`user ${email}`);

  // Catalog must be seeded
  const brands = await api('GET', '/catalog/brands');
  assert(brands.status === 200, `brands ${brands.status}`);
  assert(Array.isArray(brands.json?.data) && brands.json.data.length > 0, 'catalog empty — run seed-storefront.sh');
  console.log('OK catalog seeded');

  const banners = await api('GET', '/banners');
  assert(banners.status === 200, `banners ${banners.status}`);
  console.log('OK banners', Array.isArray(banners.json?.data) ? banners.json.data.length : '?');

  const nav = await api('GET', '/navigation');
  assert(nav.status === 200, `navigation ${nav.status}`);
  console.log('OK navigation');

  // Register
  let auth = await api('POST', '/auth/register', {
    body: { email, password },
  });
  if (auth.status >= 400) {
    auth = await api('POST', '/auth/login', {
      body: { identifier: email, password },
    });
  }
  assert(auth.status === 200 && auth.json?.data?.accessToken, `auth failed ${auth.status} ${JSON.stringify(auth.json)}`);
  const token = auth.json.data.accessToken;
  console.log('OK auth');

  // Guest-style cart with session, then authenticated cart
  const add = await api('POST', `/cart/items?sessionKey=${SESSION}`, {
    token,
    body: { variantId: VARIANT_ID, quantity: 1 },
  });
  assert(add.status === 200, `add cart ${add.status} ${JSON.stringify(add.json)}`);
  console.log('OK cart add');

  const cart = await api('GET', `/cart?sessionKey=${SESSION}`, { token });
  assert(cart.status === 200 && (cart.json?.data?.items?.length ?? 0) >= 1, `cart empty ${JSON.stringify(cart.json)}`);
  console.log('OK cart get', cart.json.data.items.length, 'items');

  const wish = await api('POST', '/wishlist/items', {
    token,
    body: { variantId: VARIANT_ID },
  });
  assert([200, 201].includes(wish.status) || wish.json?.success, `wishlist ${wish.status} ${JSON.stringify(wish.json)}`);
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
  assert(checkout.status === 200 || checkout.status === 201, `checkout ${checkout.status} ${JSON.stringify(checkout.json)}`);
  const order = checkout.json?.data;
  console.log('OK checkout', order?.orderNumber || order?.id || JSON.stringify(order)?.slice(0, 120));

  const orders = await api('GET', '/orders', { token });
  assert(orders.status === 200, `orders ${orders.status}`);
  const list = orders.json?.data;
  assert(Array.isArray(list) && list.length >= 1, 'orders list empty');
  console.log('OK orders', list.length);

  console.log('\nE2E PASS');
}

main().catch((e) => {
  console.error('\nE2E FAIL:', e.message);
  process.exit(1);
});
