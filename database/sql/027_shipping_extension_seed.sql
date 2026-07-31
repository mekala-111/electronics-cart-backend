-- Electronics Cart — Phase 6 Shipping extension seed
-- File: 027_shipping_extension_seed.sql

BEGIN;

INSERT INTO delivery_failure_reasons (id, code, name, is_system, status, created_by, updated_by)
VALUES
  ('72000000-0000-0000-0000-000000000001', 'customer_not_available', 'Customer Not Available', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000002', 'address_not_found', 'Address Not Found', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000003', 'otp_failed', 'OTP Failed', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000004', 'damaged', 'Damaged', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000005', 'refused', 'Refused', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000006', 'weather', 'Weather', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('72000000-0000-0000-0000-000000000007', 'carrier_issue', 'Carrier Issue', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO carrier_sla (
  id, partner_id, service_type, promised_days, average_days, success_rate, sample_size, measured_from, measured_to, status, created_by, updated_by
) VALUES (
  '72100000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'surface', 4.00, 3.60, 96.50, 1250,
  DATE '2026-01-01', DATE '2026-06-30', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO pickup_points (
  id, partner_id, code, name, location, city, state, country, postal_code,
  working_hours, point_type, status, created_by, updated_by
) VALUES (
  '72200000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'SR-HYD-PU-01',
  'Shiprocket Pickup — Hitech City',
  'Plot 12, Hitech City Main Rd, Hyderabad',
  'Hyderabad', 'Telangana', 'India', '500081',
  '{"mon_fri":"09:00-20:00","sat":"10:00-18:00","sun":"closed"}'::jsonb,
  'store', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipment_insurance (
  id, shipment_id, provider, insured_value, premium, currency, policy_number, claim_status, created_by, updated_by
) VALUES (
  '72300000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  'Shiprocket Secure',
  82588.20, 165.00, 'INR', 'SR-INS-SEED-001', 'none',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipping_cost_breakdown (
  id, shipment_id, currency, base_charge, fuel_surcharge, handling_fee, insurance, cod_fee, tax, other_charge, total_charge, created_by, updated_by
) VALUES (
  '72400000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  'INR', 49.00, 8.00, 0, 165.00, 0, 40.00, 0, 262.00,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery_slots (
  id, shipment_id, slot_start, slot_end, is_confirmed, status, created_by, updated_by
) VALUES (
  '72500000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  (CURRENT_DATE + INTERVAL '2 days') + TIME '10:00',
  (CURRENT_DATE + INTERVAL '2 days') + TIME '13:00',
  FALSE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipment_eta_history (
  id, shipment_id, old_eta, new_eta, reason, source, updated_at, created_by, updated_by
) VALUES (
  '72600000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  NULL,
  NOW() + INTERVAL '3 days',
  'Initial ETA from Shiprocket',
  'carrier',
  NOW() - INTERVAL '12 hours',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

UPDATE shipments
SET estimated_delivery_at = NOW() + INTERVAL '3 days',
    updated_at = NOW()
WHERE id = '71000000-0000-0000-0000-000000000001'
  AND estimated_delivery_at IS NULL;

COMMIT;
