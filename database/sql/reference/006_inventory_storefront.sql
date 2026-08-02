-- Production reference: warehouses + stock for storefront sample variant.
-- Requires 005_catalog_storefront.sql (variant 37000000-...-0001).

BEGIN;

INSERT INTO warehouses (id, name, code, address, city, state, country, postal_code, status, created_by, updated_by)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'Hyderabad Hub', 'HYD-01', 'Banjara Hills Rd 12', 'Hyderabad', 'Telangana', 'India', '500034', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouse_zones (id, warehouse_id, code, name, status, created_by, updated_by)
VALUES
  ('40100000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'ZONE-A', 'Storage A', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouse_racks (id, zone_id, code, status, created_by, updated_by)
VALUES
  ('40200000-0000-0000-0000-000000000001', '40100000-0000-0000-0000-000000000001', 'R01', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouse_bins (id, rack_id, code, barcode, status, created_by, updated_by)
VALUES
  ('40400000-0000-0000-0000-000000000001', '40200000-0000-0000-0000-000000000001', 'B01', 'HYD-A-R01-B01', 'active', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (
  id, warehouse_id, bin_id, variant_id,
  available_quantity, reserved_quantity, damaged_quantity, in_transit_quantity,
  reorder_level, maximum_stock, last_stock_update, status, created_by, updated_by
) VALUES
(
  '42000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '40400000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000001',
  25, 0, 0, 0,
  5, 50, NOW(), 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
),
(
  '42000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000001',
  '40400000-0000-0000-0000-000000000001',
  '37000000-0000-0000-0000-000000000002',
  15, 0, 0, 0,
  3, 40, NOW(), 'active',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
