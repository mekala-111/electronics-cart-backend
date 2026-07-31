-- Electronics Cart — Phase 7 Warranty & Service seed
-- File: 030_warranty_seed.sql
-- Requires sample order/serial/variant + HYD warehouse

BEGIN;

INSERT INTO users (
  id, email, mobile, password_hash, user_type, auth_provider, status, created_by, updated_by
) VALUES (
  '80000000-0000-0000-0000-000000000010',
  'tech.hyd@electronicscart.local',
  '9000000010',
  '$2b$10$seedplaceholderhashfortechnician01',
  'technician',
  'local',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO warranty_providers (id, code, name, contact_email, status, created_by, updated_by)
VALUES
  ('81000000-0000-0000-0000-000000000001', 'apple', 'Apple Inc.', 'warranty@apple.example', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('81000000-0000-0000-0000-000000000002', 'electronics_cart', 'Electronics Cart Care', 'care@electronicscart.local', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warranty_plans (
  id, provider_id, code, name, plan_type, coverage, coverage_terms, duration_months, claim_limit, currency, status, created_by, updated_by
) VALUES
  (
    '81100000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    'APPLE-MFG-12',
    'Apple Manufacturer Warranty 12M',
    'manufacturer',
    'Manufacturing defects',
    'Excludes accidental damage and liquid damage',
    12, NULL, 'INR', 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '81100000-0000-0000-0000-000000000002',
    '81000000-0000-0000-0000-000000000002',
    'EC-EXT-24',
    'Electronics Cart Extended 24M',
    'extended',
    'Extended hardware coverage',
    'Starts after manufacturer warranty ends',
    24, 100000, 'INR', 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '81100000-0000-0000-0000-000000000003',
    '81000000-0000-0000-0000-000000000002',
    'EC-ADP-12',
    'Accidental Damage Protection 12M',
    'adp',
    'Accidental and liquid damage',
    'One claim per year; deductible may apply',
    12, 75000, 'INR', 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '81100000-0000-0000-0000-000000000004',
    '81000000-0000-0000-0000-000000000002',
    'EC-AMC-12',
    'Annual Maintenance Contract 12M',
    'amc',
    'Preventive maintenance visits',
    'Two scheduled service visits per year',
    12, NULL, 'INR', 'active',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO warranty_registrations (
  id, registration_number, plan_id, customer_id, order_id, order_item_id,
  serial_number_id, variant_id, purchase_date, start_date, end_date, status, created_by, updated_by
) VALUES (
  '82000000-0000-0000-0000-000000000001',
  'WR-EC-2026-000001',
  '81100000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  '54100000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  CURRENT_DATE - 2, CURRENT_DATE - 2, ((CURRENT_DATE - 2) + INTERVAL '12 months')::date,
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

UPDATE serial_numbers
SET warranty_status = 'active',
    updated_at = NOW()
WHERE id = '44000000-0000-0000-0000-000000000001'
  AND warranty_status = 'not_registered';

INSERT INTO warranty_claims (
  id, claim_number, registration_id, customer_id, serial_number_id,
  issue_summary, issue_detail, status, submitted_at, created_by, updated_by
) VALUES (
  '82100000-0000-0000-0000-000000000001',
  'WC-EC-2026-000001',
  '82000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000001',
  'Keyboard keys intermittent',
  'Several keys fail to register intermittently under warranty.',
  'approved',
  NOW() - INTERVAL '1 day',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO warranty_status_history (
  id, registration_id, claim_id, from_status, to_status, notes, changed_at, actor_id, created_by, updated_by
) VALUES
  (
    '82200000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000001',
    NULL,
    'pending', 'active', 'Registration activated at sale',
    NOW() - INTERVAL '2 days',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '82200000-0000-0000-0000-000000000002',
    NULL,
    '82100000-0000-0000-0000-000000000001',
    'submitted', 'approved', 'Covered under manufacturer warranty',
    NOW() - INTERVAL '20 hours',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_centers (id, code, name, is_authorized, status, created_by, updated_by)
VALUES (
  '83000000-0000-0000-0000-000000000001',
  'SC-HYD-01',
  'Electronics Cart Service — Hyderabad',
  TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO service_center_locations (
  id, service_center_id, label, line1, city, state, country, postal_code, phone, warehouse_id, is_primary, status, created_by, updated_by
) VALUES (
  '83100000-0000-0000-0000-000000000001',
  '83000000-0000-0000-0000-000000000001',
  'Main Bench',
  'Banjara Hills Rd 12',
  'Hyderabad', 'Telangana', 'India', '500034',
  '04000000001',
  '40000000-0000-0000-0000-000000000001',
  TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO technicians (
  id, user_id, service_center_id, employee_code, display_name, is_available, status, created_by, updated_by
) VALUES (
  '83200000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000010',
  '83000000-0000-0000-0000-000000000001',
  'TECH-HYD-001',
  'Ravi Technician',
  TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO technician_skills (id, technician_id, skill_code, skill_name, proficiency, status, created_by, updated_by)
VALUES (
  '83300000-0000-0000-0000-000000000001',
  '83200000-0000-0000-0000-000000000001',
  'laptop_keyboard',
  'Laptop Keyboard Repair',
  4, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO service_tickets (
  id, ticket_number, customer_id, registration_id, claim_id, service_center_id, location_id,
  technician_id, serial_number_id, order_id, order_item_id, title, description, status, priority,
  opened_at, assigned_at, created_by, updated_by
) VALUES (
  '84000000-0000-0000-0000-000000000001',
  'ST-EC-2026-000001',
  '50000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  '82100000-0000-0000-0000-000000000001',
  '83000000-0000-0000-0000-000000000001',
  '83100000-0000-0000-0000-000000000001',
  '83200000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  '54100000-0000-0000-0000-000000000001',
  'MacBook keyboard intermittent',
  'Warranty claim approved — diagnose and repair keyboard.',
  'diagnosis',
  2,
  NOW() - INTERVAL '18 hours',
  NOW() - INTERVAL '16 hours',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_status_history (
  id, ticket_id, from_status, to_status, notes, changed_at, actor_id, created_by, updated_by
) VALUES
  (
    '84100000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0000-000000000001',
    NULL, 'created', 'Ticket opened from claim',
    NOW() - INTERVAL '18 hours',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '84100000-0000-0000-0000-000000000002',
    '84000000-0000-0000-0000-000000000001',
    'created', 'assigned', 'Assigned to TECH-HYD-001',
    NOW() - INTERVAL '16 hours',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '84100000-0000-0000-0000-000000000003',
    '84000000-0000-0000-0000-000000000001',
    'assigned', 'diagnosis', 'Diagnosis started',
    NOW() - INTERVAL '14 hours',
    '80000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO diagnostic_reports (
  id, ticket_id, technician_id, findings, root_cause, recommended_action, is_warranty_covered, reported_at, status, created_by, updated_by
) VALUES (
  '84200000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  '83200000-0000-0000-0000-000000000001',
  'Membrane under spacebar degraded',
  'Manufacturing defect',
  'Replace keyboard assembly',
  TRUE, NOW() - INTERVAL '12 hours', 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO repair_parts (
  id, sku, name, warehouse_id, unit_cost, currency, is_serialized, status, created_by, updated_by
) VALUES (
  '84300000-0000-0000-0000-000000000001',
  'SPA-MBA-KB-M2',
  'MacBook Air M2 Keyboard Assembly',
  '40000000-0000-0000-0000-000000000001',
  4500.00, 'INR', FALSE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO repair_jobs (
  id, repair_number, ticket_id, technician_id, labor_cost, currency, started_at, outcome, repair_notes, status, created_by, updated_by
) VALUES (
  '84400000-0000-0000-0000-000000000001',
  'RJ-EC-2026-000001',
  '84000000-0000-0000-0000-000000000001',
  '83200000-0000-0000-0000-000000000001',
  0, 'INR',
  NOW() - INTERVAL '6 hours',
  'pending',
  'Awaiting keyboard part fitment',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO repair_part_usage (
  id, repair_job_id, repair_part_id, warehouse_id, quantity, unit_cost, is_warranty_covered, status, created_by, updated_by
) VALUES (
  '84500000-0000-0000-0000-000000000001',
  '84400000-0000-0000-0000-000000000001',
  '84300000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  1, 4500.00, TRUE, 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO rma_requests (
  id, rma_number, rma_type, customer_id, order_id, order_item_id, claim_id, ticket_id, serial_number_id,
  reason, status, requested_at, created_by, updated_by
) VALUES (
  '84600000-0000-0000-0000-000000000001',
  'RMA-EC-2026-000001',
  'warranty_repair',
  '50000000-0000-0000-0000-000000000001',
  '54000000-0000-0000-0000-000000000001',
  '54100000-0000-0000-0000-000000000001',
  '82100000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000001',
  'In-warranty keyboard repair',
  'approved',
  NOW() - INTERVAL '1 day',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO trade_in_requests (
  id, request_number, customer_id, variant_id, device_label, status, requested_at, created_by, updated_by
) VALUES (
  '84700000-0000-0000-0000-000000000001',
  'TI-EC-2026-000001',
  '50000000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  'Customer MacBook Air trade-in inquiry',
  'evaluating',
  NOW() - INTERVAL '3 hours',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO trade_in_evaluations (
  id, trade_in_request_id, cosmetic_grade, battery_health, functional_test_pass, functional_notes,
  estimated_value, approved_value, currency, evaluated_by, evaluated_at, status, created_by, updated_by
) VALUES (
  '84800000-0000-0000-0000-000000000001',
  '84700000-0000-0000-0000-000000000001',
  'a',
  92,
  TRUE,
  'All ports OK; minor wear on lid',
  42000.00, NULL, 'INR',
  '83200000-0000-0000-0000-000000000001',
  NOW() - INTERVAL '1 hour',
  'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO service_audit_logs (
  id, ticket_id, claim_id, repair_job_id, action, actor_id, metadata, created_by, updated_by
) VALUES (
  '84900000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  '82100000-0000-0000-0000-000000000001',
  '84400000-0000-0000-0000-000000000001',
  'repair_job_opened',
  '80000000-0000-0000-0000-000000000010',
  '{"repair_number":"RJ-EC-2026-000001"}'::jsonb,
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
