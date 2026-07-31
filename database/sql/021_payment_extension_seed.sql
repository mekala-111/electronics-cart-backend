-- Electronics Cart — Phase 5 extension seed
-- File: 021_payment_extension_seed.sql

BEGIN;

INSERT INTO saved_payment_methods (
  id, customer_id, gateway_id, token, brand, last_four, expiry_month, expiry_year, is_default, status, created_by, updated_by
) VALUES (
  '62000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'token_rz_seed_visa_1111',
  'visa', '1111', 12, 2028, TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO settlement_batches (
  id, gateway_id, batch_reference, settlement_date, currency, total_amount, status, created_by, updated_by
) VALUES (
  '62100000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'batch_RZ_2026_001',
  CURRENT_DATE - 1,
  'INR', 81000.00, 'settled',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

UPDATE payment_settlements
SET settlement_batch_id = '62100000-0000-0000-0000-000000000001'
WHERE id = '61400000-0000-0000-0000-000000000001'
  AND settlement_batch_id IS NULL;

INSERT INTO merchant_accounts (
  id, vendor_id, gateway_id, merchant_reference, status, created_by, updated_by
) VALUES (
  '62200000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  '60000000-0000-0000-0000-000000000001',
  'acc_RZ_vendor_admin_seed',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_events (
  id, payment_id, event, payload, received_at, created_by, updated_by
) VALUES
  (
    '62300000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    'payment.authorized',
    '{"id":"pay_RZseed001"}'::jsonb,
    NOW() - INTERVAL '2 days',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '62300000-0000-0000-0000-000000000002',
    '61000000-0000-0000-0000-000000000001',
    'payment.captured',
    '{"id":"pay_RZseed001","status":"captured"}'::jsonb,
    NOW() - INTERVAL '2 days',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO exchange_rates (
  id, base_currency, target_currency, rate, effective_date, created_by, updated_by
) VALUES
  ('62400000-0000-0000-0000-000000000001', 'INR', 'USD', 0.01200000, CURRENT_DATE, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('62400000-0000-0000-0000-000000000002', 'USD', 'INR', 83.25000000, CURRENT_DATE, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

COMMIT;
