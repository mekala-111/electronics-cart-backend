-- Electronics Cart — Phase 4 Orders seed
-- File: 012_order_seed.sql
-- Requires Phase 1–3 seeds (system user, MacBook variant, HYD warehouse, serial)

BEGIN;

-- Demo customer
INSERT INTO users (
  id, email, mobile, password_hash, user_type, auth_provider, status, created_by, updated_by
) VALUES (
  '50000000-0000-0000-0000-000000000001',
  'customer@electronicscart.in',
  '9000000001',
  '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$placeholder_replace_in_app',
  'customer',
  'local',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Cart (authenticated)
INSERT INTO carts (id, user_id, currency, status, created_by, updated_by)
VALUES (
  '51000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'INR', 'converted',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO cart_items (id, cart_id, variant_id, quantity, unit_price, status, created_by, updated_by)
VALUES (
  '51100000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  1, 74990, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Wishlist
INSERT INTO wishlists (id, user_id, name, status, created_by, updated_by)
VALUES (
  '52000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'Default', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wishlist_items (id, wishlist_id, variant_id, status, created_by, updated_by)
VALUES (
  '52100000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Coupon 10% off laptops category, max ₹5k, min cart ₹20k
INSERT INTO coupons (
  id, code, name, discount_type, discount_value, min_cart_value, max_discount,
  usage_limit, per_user_limit, starts_at, expires_at, status, created_by, updated_by
) VALUES (
  '53000000-0000-0000-0000-000000000001',
  'LAPTOP10',
  '10% off Laptops',
  'percentage', 10, 20000, 5000,
  1000, 2,
  NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO coupon_rules (id, coupon_id, rule_type, category_id, status, created_by, updated_by)
VALUES (
  '53100000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000001',
  'category',
  '32000000-0000-0000-0000-000000000001',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Order
INSERT INTO orders (
  id, order_number, customer_id, cart_id, coupon_id, fulfillment_warehouse_id,
  currency, subtotal, discount_total, tax_total, shipping_charge, grand_total,
  placed_at, status, created_by, updated_by
) VALUES (
  '54000000-0000-0000-0000-000000000001',
  'EC-2026-000001',
  '50000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'INR', 74990, 5000, 12598.20, 0, 82588.20,
  NOW() - INTERVAL '2 days', 'processing',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO coupon_usage (id, coupon_id, user_id, order_id, discount_amount, created_by, updated_by)
VALUES (
  '53200000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  5000,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (
  id, order_id, variant_id, serial_number_id,
  product_name_snapshot, sku_snapshot, quantity,
  unit_price, discount_amount, gst_rate, gst_amount, line_total,
  warranty_months, warranty_snapshot, hsn_code, status, created_by, updated_by
) VALUES (
  '54100000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000001',
  'Apple MacBook Air M2', 'MBA-M2-8-256', 1,
  74990, 5000, 18, 12598.20, 82588.20,
  12, '1 Year Apple Warranty', '8471',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO order_addresses (
  id, order_id, address_type, full_name, phone, line1, city, state, country, postal_code, created_by, updated_by
) VALUES
  (
    '54200000-0000-0000-0000-000000000001',
    '54000000-0000-0000-0000-000000000001',
    'shipping', 'Demo Customer', '9000000001',
    '12 Jubilee Hills', 'Hyderabad', 'Telangana', 'India', '500033',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
  ),
  (
    '54200000-0000-0000-0000-000000000002',
    '54000000-0000-0000-0000-000000000001',
    'billing', 'Demo Customer', '9000000001',
    '12 Jubilee Hills', 'Hyderabad', 'Telangana', 'India', '500033',
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_status_history (id, order_id, from_status, to_status, note, changed_at, created_by, updated_by)
VALUES
  ('54300000-0000-0000-0000-000000000001', '54000000-0000-0000-0000-000000000001', NULL, 'pending', 'Order created', NOW() - INTERVAL '2 days', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('54300000-0000-0000-0000-000000000002', '54000000-0000-0000-0000-000000000001', 'pending', 'confirmed', 'Payment confirmed (placeholder)', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('54300000-0000-0000-0000-000000000003', '54000000-0000-0000-0000-000000000001', 'confirmed', 'processing', 'Allocated to HYD warehouse', NOW() - INTERVAL '1 day', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_notes (id, order_id, author_id, body, visibility, created_by, updated_by)
VALUES (
  '54400000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Customer requested gift wrap (sample note)',
  'internal',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO order_events (id, order_id, event_type, message, occurred_at, created_by, updated_by)
VALUES
  ('54500000-0000-0000-0000-000000000001', '54000000-0000-0000-0000-000000000001', 'created', 'Order EC-2026-000001 created', NOW() - INTERVAL '2 days', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('54500000-0000-0000-0000-000000000002', '54000000-0000-0000-0000-000000000001', 'coupon_applied', 'LAPTOP10 applied (−₹5000)', NOW() - INTERVAL '2 days', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('54500000-0000-0000-0000-000000000003', '54000000-0000-0000-0000-000000000001', 'status_changed', 'Status → processing', NOW() - INTERVAL '1 day', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Link reservation to order
UPDATE stock_reservations
SET order_id = '54000000-0000-0000-0000-000000000001',
    cart_id = '51000000-0000-0000-0000-000000000001',
    status = 'consumed',
    consumed_at = NOW() - INTERVAL '2 days'
WHERE id = '46000000-0000-0000-0000-000000000001';

-- GST invoice (intra-state Telangana → CGST+SGST)
INSERT INTO invoices (
  id, invoice_number, order_id, invoice_date, currency,
  subtotal, discount_total, cgst_total, sgst_total, igst_total, shipping_charge, grand_total,
  seller_gstin, place_of_supply, status, created_by, updated_by
) VALUES (
  '55000000-0000-0000-0000-000000000001',
  'INV-EC-2026-000001',
  '54000000-0000-0000-0000-000000000001',
  CURRENT_DATE - 2,
  'INR',
  74990, 5000, 6299.10, 6299.10, 0, 0, 82588.20,
  '36AABCE1234F1Z5', 'Telangana', 'issued',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO invoice_items (
  id, invoice_id, order_item_id, variant_id, description, hsn_code, quantity,
  unit_price, discount_amount, gst_rate, cgst_amount, sgst_amount, igst_amount, line_total,
  status, created_by, updated_by
) VALUES (
  '55100000-0000-0000-0000-000000000001',
  '55000000-0000-0000-0000-000000000001',
  '54100000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  'Apple MacBook Air M2', '8471', 1,
  74990, 5000, 18, 6299.10, 6299.10, 0, 82588.20,
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
