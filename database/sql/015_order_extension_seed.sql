-- Electronics Cart — Phase 4 extension seed
-- File: 015_order_extension_seed.sql

BEGIN;

INSERT INTO cancellation_reasons (id, code, label, is_customer, sort_order, status, created_by, updated_by)
VALUES
  ('56000000-0000-0000-0000-000000000001', 'changed_mind', 'Changed my mind', TRUE, 10, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('56000000-0000-0000-0000-000000000002', 'found_cheaper', 'Found a better price', TRUE, 20, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('56000000-0000-0000-0000-000000000003', 'fraud_suspected', 'Suspected fraud', FALSE, 90, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (id, user_id, currency, balance, status, created_by, updated_by)
VALUES (
  '57000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'INR', 1500, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO store_credits (
  id, user_id, order_id, source, amount, remaining_amount, currency, status, created_by, updated_by
) VALUES (
  '57100000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  NULL,
  'promotional',
  1500, 1500, 'INR', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO wallet_transactions (
  id, wallet_id, tx_type, amount, balance_after, store_credit_id, notes, created_by, updated_by
) VALUES (
  '57200000-0000-0000-0000-000000000001',
  '57000000-0000-0000-0000-000000000001',
  'credit', 1500, 1500,
  '57100000-0000-0000-0000-000000000001',
  'Welcome promotional credit',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO gift_cards (
  id, code, initial_balance, remaining_balance, currency, purchased_by_id, expires_at, status, created_by, updated_by
) VALUES (
  '58000000-0000-0000-0000-000000000001',
  'GC-EC-DEMO-5000',
  5000, 5000, 'INR',
  '50000000-0000-0000-0000-000000000001',
  NOW() + INTERVAL '1 year',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Split-ready fulfillment for sample order (HYD)
INSERT INTO fulfillment_orders (
  id, fulfillment_number, order_id, warehouse_id, status, created_by, updated_by
) VALUES (
  '59000000-0000-0000-0000-000000000001',
  'FF-EC-2026-000001-HYD',
  '54000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'picking',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO fulfillment_items (
  id, fulfillment_order_id, order_item_id, quantity, status, created_by, updated_by
) VALUES (
  '59100000-0000-0000-0000-000000000001',
  '59000000-0000-0000-0000-000000000001',
  '54100000-0000-0000-0000-000000000001',
  1, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO pick_lists (
  id, fulfillment_order_id, pick_number, status, started_at, created_by, updated_by
) VALUES (
  '59200000-0000-0000-0000-000000000001',
  '59000000-0000-0000-0000-000000000001',
  'PICK-HYD-000001',
  'in_progress', NOW(),
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO packing_lists (
  id, fulfillment_order_id, pack_number, status, created_by, updated_by
) VALUES (
  '59300000-0000-0000-0000-000000000001',
  '59000000-0000-0000-0000-000000000001',
  'PACK-HYD-000001',
  'open',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO order_risk_scores (
  id, order_id, score, risk_level, scored_at, notes, created_by, updated_by
) VALUES (
  '5a000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  12, 'low', NOW() - INTERVAL '2 days',
  'New customer, normal device fingerprint',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO risk_events (
  id, order_id, event_code, severity, message, occurred_at, created_by, updated_by
) VALUES (
  '5a100000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  'device_check_ok',
  'low',
  'Device fingerprint matched session',
  NOW() - INTERVAL '2 days',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Invoice PDF metadata (S3 object registry)
INSERT INTO media_files (
  id, bucket, object_key, mime_type, byte_size, kind, original_name, status, created_by, updated_by
) VALUES (
  '5b000000-0000-0000-0000-000000000001',
  'electronics-cart-docs',
  'invoices/2026/INV-EC-2026-000001.pdf',
  'application/pdf',
  102400,
  'document',
  'INV-EC-2026-000001.pdf',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO invoice_documents (
  id, invoice_id, invoice_pdf_file_id, label, status, created_by, updated_by
) VALUES (
  '5b100000-0000-0000-0000-000000000001',
  '55000000-0000-0000-0000-000000000001',
  '5b000000-0000-0000-0000-000000000001',
  'Tax Invoice PDF',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
