-- Electronics Cart — Phase 7 Warranty extension seed
-- File: 033_warranty_extension_seed.sql

BEGIN;

INSERT INTO service_sla (
  id, code, name, priority, response_time_minutes, resolution_time_minutes, status, created_by, updated_by
) VALUES
  ('85000000-0000-0000-0000-000000000001', 'SLA-P1', 'Critical', 1, 60, 480, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('85000000-0000-0000-0000-000000000002', 'SLA-P2', 'High', 2, 240, 1440, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('85000000-0000-0000-0000-000000000003', 'SLA-P3', 'Normal', 3, 480, 4320, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

UPDATE service_tickets
SET service_sla_id = '85000000-0000-0000-0000-000000000002',
    updated_at = NOW()
WHERE id = '84000000-0000-0000-0000-000000000001'
  AND service_sla_id IS NULL;

INSERT INTO service_contracts (
  id, contract_number, customer_id, service_center_id, title, start_date, end_date,
  annual_value, currency, status, created_by, updated_by
) VALUES (
  '85100000-0000-0000-0000-000000000001',
  'SC-ENT-2026-000001',
  '50000000-0000-0000-0000-000000000001',
  '83000000-0000-0000-0000-000000000001',
  'Demo Enterprise Support 12M',
  DATE '2026-04-01', DATE '2027-03-31',
  120000.00, 'INR', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO contract_items (
  id, contract_id, variant_id, serial_number_id, warranty_plan_id, description, quantity, unit_value, status, created_by, updated_by
) VALUES (
  '85200000-0000-0000-0000-000000000001',
  '85100000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000001',
  '81100000-0000-0000-0000-000000000002',
  'MacBook Air M2 — covered under enterprise AMC stack',
  1, 120000.00, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO spare_part_suppliers (
  id, code, name, contact_email, lead_time_days, status, created_by, updated_by
) VALUES (
  '85300000-0000-0000-0000-000000000001',
  'SPS-KEYBOARD-IN',
  'Hyderabad Keyboard Parts Co',
  'parts@kbhyd.example',
  3, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_part_catalog (
  id, spare_part_supplier_id, repair_part_id, supplier_sku, supplier_part_name,
  unit_cost, currency, moq, lead_time_days, is_preferred, status, created_by, updated_by
) VALUES (
  '85400000-0000-0000-0000-000000000001',
  '85300000-0000-0000-0000-000000000001',
  '84300000-0000-0000-0000-000000000001',
  'SUP-MBA-KB-M2',
  'MBA M2 Keyboard Assy',
  4200.00, 'INR', 1, 3, TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO technician_certifications (
  id, technician_id, certification_name, certification_provider, certificate_number,
  issued_at, expiry_date, status, created_by, updated_by
) VALUES (
  '85500000-0000-0000-0000-000000000001',
  '83200000-0000-0000-0000-000000000001',
  'Apple Certified Mac Technician',
  'Apple Inc.',
  'ACMT-SEED-001',
  DATE '2025-01-15', DATE '2027-01-15',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO repair_metrics (
  id, ticket_id, diagnosis_time_minutes, repair_time_minutes, testing_time_minutes,
  total_turnaround_minutes, measured_at, status, created_by, updated_by
) VALUES (
  '85600000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  120, NULL, NULL, 840,
  NOW(), 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO device_health_reports (
  id, serial_number_id, ticket_id, trade_in_request_id,
  cpu_health, battery_cycles, battery_health, display_status, keyboard_status, thermal_status,
  notes, reported_at, status, created_by, updated_by
) VALUES (
  '85700000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  NULL,
  'good', 210, 94, 'excellent', 'poor', 'good',
  'Keyboard membrane degraded; thermal and battery OK',
  NOW() - INTERVAL '12 hours', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO loan_devices (
  id, asset_tag, variant_id, warehouse_id, service_center_id, status, notes, created_by, updated_by
) VALUES (
  '85800000-0000-0000-0000-000000000001',
  'LOAN-HYD-MBA-001',
  '37000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '83000000-0000-0000-0000-000000000001',
  'allocated',
  'Loaner pool — Hyderabad',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO loan_allocations (
  id, loan_device_id, ticket_id, customer_id, allocated_at, due_back_at, status, created_by, updated_by
) VALUES (
  '85900000-0000-0000-0000-000000000001',
  '85800000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '10 hours',
  NOW() + INTERVAL '5 days',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
