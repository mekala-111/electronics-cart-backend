-- Production reference: cancellation reasons + warranty providers/plans.

BEGIN;

INSERT INTO cancellation_reasons (id, code, label, is_customer, sort_order, status, created_by, updated_by)
VALUES
  ('56000000-0000-0000-0000-000000000001', 'changed_mind', 'Changed my mind', TRUE, 10, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('56000000-0000-0000-0000-000000000002', 'found_cheaper', 'Found a better price', TRUE, 20, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('56000000-0000-0000-0000-000000000003', 'fraud_suspected', 'Suspected fraud', FALSE, 90, 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

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
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
