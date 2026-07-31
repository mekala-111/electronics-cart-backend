-- Electronics Cart — EXPLAIN ANALYZE probes (run under verifyPerformance.ts)
-- Product search
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id, name, slug
FROM products
WHERE status = 'active'
  AND deleted_at IS NULL
  AND (name ILIKE '%mac%' OR slug ILIKE '%mac%')
LIMIT 50;

-- Order history
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id, order_number, status, created_at
FROM orders
WHERE customer_id = '50000000-0000-0000-0000-000000000001'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- Shipment lookup
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id, tracking_number, status
FROM shipments
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- Inventory lookup
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id, warehouse_id, variant_id, available_quantity, reserved_quantity
FROM inventory
WHERE deleted_at IS NULL
  AND available_quantity > 0
LIMIT 50;

-- Warranty lookup
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id, status, serial_number_id, variant_id
FROM warranty_registrations
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- Analytics dashboard KPIs
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id, domain, period, metric_date
FROM kpi_snapshots
WHERE deleted_at IS NULL
ORDER BY metric_date DESC
LIMIT 50;
