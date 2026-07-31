-- Electronics Cart — Phase 5 Payments seed
-- File: 018_payment_seed.sql
-- Requires Phase 4 order EC-2026-000001 + demo customer + wallet/gift card

BEGIN;

INSERT INTO payment_gateways (id, code, name, is_primary, status, created_by, updated_by)
VALUES
  ('60000000-0000-0000-0000-000000000001', 'razorpay', 'Razorpay', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', 'stripe', 'Stripe', FALSE, 'inactive', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000003', 'internal', 'Internal (Wallet/Gift)', FALSE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_methods (id, gateway_id, code, name, status, created_by, updated_by)
VALUES
  ('60100000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'upi', 'UPI', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('60100000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'credit_card', 'Credit Card', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('60100000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 'debit_card', 'Debit Card', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('60100000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001', 'net_banking', 'Net Banking', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('60100000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000001', 'emi', 'EMI', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('60100000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000003', 'store_credit', 'Store Credit', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('60100000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000003', 'gift_card', 'Gift Card', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO emi_plans (
  id, gateway_id, bank_name, emi_type, tenure_months, interest_rate, processing_fee, min_amount, status, created_by, updated_by
) VALUES
  ('60200000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'HDFC Bank', 'no_cost_emi', 6, 0, 0, 5000, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('60200000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'HDFC Bank', 'bank_emi', 9, 14.00, 199, 10000, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Captured Razorpay UPI payment for sample order
INSERT INTO payments (
  id, order_id, customer_id, gateway_id, payment_method_id,
  gateway_order_id, gateway_payment_id, gateway_signature, gateway_reference,
  amount, currency, refunded_amount, status, authorized_at, captured_at, created_by, updated_by
) VALUES (
  '61000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  '60100000-0000-0000-0000-000000000001',
  'order_RZseed001',
  'pay_RZseed001',
  'seed_signature_placeholder',
  'pay_RZseed001',
  82588.20, 'INR', 0, 'captured',
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_attempts (
  id, payment_id, customer_id, attempt_number, gateway_response, started_at, completed_at, status, created_by, updated_by
) VALUES (
  '61100000-0000-0000-0000-000000000001',
  '61000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  1,
  '{"razorpay_payment_id":"pay_RZseed001","status":"captured"}'::jsonb,
  NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days',
  'captured',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_transactions (
  id, payment_id, tx_type, amount, currency, gateway_reference, occurred_at, created_by, updated_by
) VALUES
  ('61200000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'authorize', 82588.20, 'INR', 'pay_RZseed001', NOW() - INTERVAL '2 days', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('61200000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000001', 'capture', 82588.20, 'INR', 'pay_RZseed001', NOW() - INTERVAL '2 days', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_webhooks (
  id, gateway_id, event_id, event_type, idempotency_key, signature, payload,
  verified, processing_status, retry_count, processed_at, created_by, updated_by
) VALUES (
  '61300000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'evt_seed_payment_captured',
  'payment.captured',
  'idem_seed_pay_RZseed001',
  'seed_wh_sig',
  '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_RZseed001"}}}}'::jsonb,
  TRUE, 'processed', 0, NOW() - INTERVAL '2 days',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_settlements (
  id, gateway_id, settlement_ref, settlement_date, currency,
  expected_amount, received_amount, fee_amount, tax_amount, status, created_by, updated_by
) VALUES (
  '61400000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'setl_RZseed001',
  CURRENT_DATE - 1,
  'INR',
  82588.20, 81000.00, 1340.00, 248.20, 'settled',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_reconciliation (
  id, settlement_id, payment_id, gateway_reference,
  expected_amount, received_amount, variance_amount, status, reconciled_at, notes, created_by, updated_by
) VALUES (
  '61500000-0000-0000-0000-000000000001',
  '61400000-0000-0000-0000-000000000001',
  '61000000-0000-0000-0000-000000000001',
  'pay_RZseed001',
  82588.20, 81000.00, -1588.20, 'matched',
  NOW() - INTERVAL '1 day',
  'Variance equals gateway fee + tax',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_audit_logs (
  id, payment_id, action, from_status, to_status, metadata, created_by, updated_by
) VALUES
  ('61600000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 'created', NULL, 'pending', NULL, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('61600000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000001', 'captured', 'authorized', 'captured', '{"source":"webhook"}'::jsonb, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

COMMIT;
