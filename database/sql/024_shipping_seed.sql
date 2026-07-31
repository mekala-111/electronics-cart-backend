-- Electronics Cart — Phase 6 Shipping seed
-- File: 024_shipping_seed.sql
-- Requires sample order EC-2026-000001, HYD warehouse, fulfillment FF-EC-2026-000001-HYD

BEGIN;

INSERT INTO shipping_partners (id, code, name, is_primary, status, created_by, updated_by)
VALUES
  ('70000000-0000-0000-0000-000000000001', 'shiprocket', 'Shiprocket', TRUE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', 'delhivery', 'Delhivery', FALSE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000003', 'bluedart', 'Blue Dart', FALSE, 'inactive', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000004', 'dtdc', 'DTDC', FALSE, 'inactive', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000005', 'xpressbees', 'XpressBees', FALSE, 'inactive', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000006', 'india_post', 'India Post', FALSE, 'inactive', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shipping_services (id, partner_id, code, name, service_type, is_cod_supported, is_international, status, created_by, updated_by)
VALUES
  ('70100000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'sr_surface', 'Shiprocket Surface', 'surface', TRUE, FALSE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('70100000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'sr_express', 'Shiprocket Express', 'express', TRUE, FALSE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('70100000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', 'dlv_express', 'Delhivery Express', 'express', TRUE, FALSE, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shipping_zones (id, code, name, country, pincode_from, pincode_to, status, created_by, updated_by)
VALUES
  ('70200000-0000-0000-0000-000000000001', 'IN-SOUTH', 'South India', 'India', '500000', '699999', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('70200000-0000-0000-0000-000000000002', 'IN-NORTH', 'North India', 'India', '110000', '249999', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shipping_rate_cards (id, partner_id, service_id, name, currency, effective_from, status, created_by, updated_by)
VALUES (
  '70300000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '70100000-0000-0000-0000-000000000001',
  'Shiprocket Surface FY26',
  'INR', DATE '2026-04-01', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipping_rates (
  id, rate_card_id, from_zone_id, to_zone_id, min_weight_kg, max_weight_kg, base_rate, per_kg_rate, currency, status, created_by, updated_by
) VALUES (
  '70400000-0000-0000-0000-000000000001',
  '70300000-0000-0000-0000-000000000001',
  '70200000-0000-0000-0000-000000000001',
  '70200000-0000-0000-0000-000000000001',
  0, 5, 49.00, 18.00, 'INR', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipping_rules (
  id, name, priority, warehouse_id, partner_id, service_id, conditions_json, status, created_by, updated_by
) VALUES (
  '70500000-0000-0000-0000-000000000001',
  'HYD default Shiprocket Surface',
  10,
  '40000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '70100000-0000-0000-0000-000000000001',
  '{"max_weight_kg": 20, "cod": true}'::jsonb,
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO pickup_schedules (
  id, warehouse_id, partner_id, day_of_week, window_start, window_end, status, created_by, updated_by
) VALUES (
  '70600000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  1, '10:00', '14:00', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO pickup_requests (
  id, warehouse_id, partner_id, pickup_schedule_id, partner_pickup_ref,
  scheduled_at, package_count, status, created_by, updated_by
) VALUES (
  '70700000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '70600000-0000-0000-0000-000000000001',
  'SR-PICKUP-SEED-001',
  NOW() + INTERVAL '1 day',
  1, 'scheduled',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipments (
  id, shipment_number, order_id, fulfillment_order_id, warehouse_id, partner_id, service_id,
  pickup_request_id, shipping_address_id, tracking_number, awb_number, partner_shipment_ref,
  currency, shipping_charge, declared_value, total_weight_kg, volumetric_weight_kg,
  status, packed_at, created_by, updated_by
) VALUES (
  '71000000-0000-0000-0000-000000000001',
  'SHP-EC-2026-000001',
  '54000000-0000-0000-0000-000000000001',
  '59000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '70100000-0000-0000-0000-000000000001',
  '70700000-0000-0000-0000-000000000001',
  (SELECT id FROM order_addresses WHERE order_id = '54000000-0000-0000-0000-000000000001' AND address_type = 'shipping' LIMIT 1),
  'SRTRACKSEED001',
  'SRAWBSEED001',
  'sr_order_seed_001',
  'INR', 0, 82588.20, 1.800, 2.100,
  'packed', NOW() - INTERVAL '12 hours',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipment_packages (
  id, shipment_id, package_number, length_cm, width_cm, height_cm,
  weight_kg, volumetric_weight_kg, declared_value, status, created_by, updated_by
) VALUES (
  '71100000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  'PKG-1',
  40, 30, 12,
  1.800, 2.100, 82588.20, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipment_items (
  id, shipment_id, order_item_id, package_id, quantity, status, created_by, updated_by
) VALUES (
  '71200000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  '54100000-0000-0000-0000-000000000001',
  '71100000-0000-0000-0000-000000000001',
  1, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO awb_numbers (
  id, partner_id, awb_number, shipment_id, assigned_at, status, created_by, updated_by
) VALUES (
  '71300000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  'SRAWBSEED001',
  '71000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '12 hours',
  'assigned',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipment_labels (
  id, shipment_id, package_id, label_url, label_format, generated_at, status, created_by, updated_by
) VALUES (
  '71400000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  '71100000-0000-0000-0000-000000000001',
  'https://example.local/labels/SRAWBSEED001.pdf',
  'pdf', NOW() - INTERVAL '12 hours', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO shipment_tracking (
  id, shipment_id, current_status, last_location, last_event_at, created_by, updated_by
) VALUES (
  '71500000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  'packed',
  'HYD Warehouse',
  NOW() - INTERVAL '12 hours',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO tracking_events (
  id, shipment_id, tracking_id, event_status, event_code, description, location, occurred_at, created_by, updated_by
) VALUES
  (
    '71600000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    '71500000-0000-0000-0000-000000000001',
    'created', 'CREATED', 'Shipment created', 'HYD Warehouse',
    NOW() - INTERVAL '13 hours',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '71600000-0000-0000-0000-000000000002',
    '71000000-0000-0000-0000-000000000001',
    '71500000-0000-0000-0000-000000000001',
    'packed', 'PACKED', 'Package packed and labeled', 'HYD Warehouse',
    NOW() - INTERVAL '12 hours',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO shipping_webhooks (
  id, partner_id, shipment_id, event_id, event_type, idempotency_key, payload,
  verified, processing_status, retry_count, processed_at, created_by, updated_by
) VALUES (
  '71700000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  'sr_evt_seed_packed',
  'shipment.packed',
  'shiprocket:sr_evt_seed_packed',
  '{"awb":"SRAWBSEED001","status":"packed"}'::jsonb,
  TRUE, 'processed', 0, NOW() - INTERVAL '12 hours',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
