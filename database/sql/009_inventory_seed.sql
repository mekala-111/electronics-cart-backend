-- Electronics Cart — Phase 3 Inventory seed
-- File: 009_inventory_seed.sql
-- Requires Phase 1–2 seeds (system user + sample variant 37000000-...-0001)

BEGIN;

-- Warehouses
INSERT INTO warehouses (id, name, code, address, city, state, country, postal_code, status, created_by, updated_by)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'Hyderabad Hub', 'HYD-01', 'Banjara Hills Rd 12', 'Hyderabad', 'Telangana', 'India', '500034', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', 'Bengaluru Hub', 'BLR-02', 'Whitefield Main Rd', 'Bengaluru', 'Karnataka', 'India', '560066', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', 'Mumbai Hub', 'MUM-01', 'Andheri East', 'Mumbai', 'Maharashtra', 'India', '400069', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouse_zones (id, warehouse_id, code, name, status, created_by, updated_by)
VALUES
  ('40100000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'ZONE-A', 'Storage A', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('40100000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'ZONE-R', 'Refurb', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('40100000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 'ZONE-A', 'Storage A', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouse_racks (id, zone_id, code, status, created_by, updated_by)
VALUES
  ('40200000-0000-0000-0000-000000000001', '40100000-0000-0000-0000-000000000001', 'R01', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('40200000-0000-0000-0000-000000000002', '40100000-0000-0000-0000-000000000002', 'R01', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('40200000-0000-0000-0000-000000000003', '40100000-0000-0000-0000-000000000003', 'R01', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouse_bins (id, rack_id, code, barcode, status, created_by, updated_by)
VALUES
  ('40400000-0000-0000-0000-000000000001', '40200000-0000-0000-0000-000000000001', 'B01', 'HYD-A-R01-B01', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('40400000-0000-0000-0000-000000000002', '40200000-0000-0000-0000-000000000002', 'B01', 'HYD-R-R01-B01', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('40400000-0000-0000-0000-000000000003', '40200000-0000-0000-0000-000000000003', 'B01', 'BLR-A-R01-B01', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Supplier
INSERT INTO suppliers (id, company_name, slug, gst_number, contact_person, email, mobile, payment_terms, rating, status, created_by, updated_by)
VALUES (
  '41000000-0000-0000-0000-000000000001',
  'TechSource India Pvt Ltd',
  'techsource-india',
  '36AABCT1332L1ZB',
  'Ravi Kumar',
  'procurement@techsource.in',
  '9876543210',
  'Net 30',
  4.50,
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_contacts (id, supplier_id, name, email, mobile, role_title, is_primary, status, created_by, updated_by)
VALUES (
  '41100000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  'Ravi Kumar',
  'ravi@techsource.in',
  '9876543210',
  'Account Manager',
  TRUE,
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Inventory for sample MacBook variant (HYD bin B01)
INSERT INTO inventory (
  id, warehouse_id, bin_id, variant_id,
  available_quantity, reserved_quantity, damaged_quantity, in_transit_quantity,
  reorder_level, maximum_stock, last_stock_update, status, created_by, updated_by
) VALUES (
  '42000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '40400000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  12, 2, 0, 0,
  5, 50, NOW(), 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Low sample stock in Bengaluru (drives alert seed)
INSERT INTO inventory (
  id, warehouse_id, bin_id, variant_id,
  available_quantity, reserved_quantity, damaged_quantity, in_transit_quantity,
  reorder_level, maximum_stock, last_stock_update, status, created_by, updated_by
) VALUES (
  '42000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000002',
  '40400000-0000-0000-0000-000000000003',
  '37000000-0000-0000-0000-000000000001',
  3, 0, 0, 0,
  5, 40, NOW(), 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Purchase order
INSERT INTO purchase_orders (
  id, po_number, supplier_id, warehouse_id, order_date, expected_date,
  currency, subtotal, tax_total, grand_total, status, created_by, updated_by
) VALUES (
  '43000000-0000-0000-0000-000000000001',
  'PO-2026-0001',
  '41000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  CURRENT_DATE - 7, CURRENT_DATE + 3,
  'INR', 620000, 111600, 731600, 'ordered',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_order_items (
  id, purchase_order_id, variant_id, quantity_ordered, quantity_received,
  unit_cost, tax_percent, line_total, status, created_by, updated_by
) VALUES (
  '43100000-0000-0000-0000-000000000001',
  '43000000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  10, 0,
  62000, 18, 731600, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Serial numbers in HYD warehouse
INSERT INTO serial_numbers (
  id, serial_number, barcode, warehouse_id, bin_id, variant_id, purchase_order_item_id,
  status, warranty_status, refurbishment_status, created_by, updated_by
) VALUES
  (
    '44000000-0000-0000-0000-000000000001',
    'C02XL0ABJHD1',
    'SN-MBA-0001',
    '40000000-0000-0000-0000-000000000001',
    '40400000-0000-0000-0000-000000000001',
    '37000000-0000-0000-0000-000000000001',
    '43100000-0000-0000-0000-000000000001',
    'in_stock',
    'not_registered',
    NULL,
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '44000000-0000-0000-0000-000000000002',
    'C02XL0ABJHD2',
    'SN-MBA-0002',
    '40000000-0000-0000-0000-000000000001',
    '40400000-0000-0000-0000-000000000002',
    '37000000-0000-0000-0000-000000000001',
    '43100000-0000-0000-0000-000000000001',
    'under_repair',
    'active',
    'repair',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Opening stock movement
INSERT INTO inventory_movements (
  id, warehouse_id, variant_id, movement_type, quantity,
  reference_type, reference_id, notes, occurred_at, status, created_by, updated_by
) VALUES (
  '45000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  'purchase',
  14,
  'purchase_order',
  '43000000-0000-0000-0000-000000000001',
  'Opening stock from PO-2026-0001 (sample)',
  NOW() - INTERVAL '3 days',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Active checkout reservation
INSERT INTO stock_reservations (
  id, warehouse_id, variant_id, quantity, session_key, expires_at, status, created_by, updated_by
) VALUES (
  '46000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  2,
  'seed-session-checkout',
  NOW() + INTERVAL '15 minutes',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Low stock alert example (open when near reorder)
INSERT INTO low_stock_alerts (
  id, warehouse_id, variant_id, available_quantity, reorder_level, status, created_by, updated_by
) VALUES (
  '47000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '37000000-0000-0000-0000-000000000001',
  3,
  5,
  'open',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Batch / lot
INSERT INTO inventory_batches (
  id, warehouse_id, bin_id, variant_id, supplier_id,
  batch_number, supplier_batch, manufactured_date, expiry_date, quantity,
  status, created_by, updated_by
) VALUES (
  '48000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '40400000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  'BATCH-HYD-2026-001',
  'TS-LOT-8891',
  CURRENT_DATE - 90,
  CURRENT_DATE + 365,
  12,
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

UPDATE serial_numbers
SET batch_id = '48000000-0000-0000-0000-000000000001'
WHERE id = '44000000-0000-0000-0000-000000000001'
  AND batch_id IS NULL;

-- Cost history
INSERT INTO purchase_cost_history (
  id, variant_id, supplier_id, cost_price, currency, effective_from, effective_to, created_by, updated_by
) VALUES (
  '48100000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  62000, 'INR', CURRENT_DATE - 30, NULL,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Return-to-stock (open-box)
INSERT INTO return_to_stock (
  id, source, warehouse_id, bin_id, variant_id, quantity, status, notes, created_by, updated_by
) VALUES (
  '48200000-0000-0000-0000-000000000001',
  'open_box_inspection',
  '40000000-0000-0000-0000-000000000001',
  '40400000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  1, 'inspection', 'Display unit inspection',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Forecast
INSERT INTO inventory_forecast (
  id, variant_id, expected_sales, recommended_purchase, forecast_date, created_by, updated_by
) VALUES (
  '48300000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  40, 25, DATE_TRUNC('month', CURRENT_DATE)::date,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Supplier scorecard
INSERT INTO supplier_scorecards (
  id, supplier_id, on_time_delivery, quality_score, return_rate, average_lead_time, scored_on, created_by, updated_by
) VALUES (
  '48400000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  96.50, 94.00, 1.20, 7, CURRENT_DATE,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Warehouse capacity
INSERT INTO warehouse_capacity (
  id, warehouse_id, maximum_units, occupied_units, status, created_by, updated_by
) VALUES
  ('48500000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 5000, 14, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('48500000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 4000, 3, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Cycle count
INSERT INTO cycle_count_jobs (
  id, warehouse_id, job_number, scheduled_at, status, created_by, updated_by
) VALUES (
  '48600000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'CC-HYD-2026-001',
  NOW() + INTERVAL '1 day',
  'planned',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO cycle_count_items (
  id, cycle_count_job_id, bin_id, variant_id, expected_quantity, status, created_by, updated_by
) VALUES (
  '48700000-0000-0000-0000-000000000001',
  '48600000-0000-0000-0000-000000000001',
  '40400000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  12, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
