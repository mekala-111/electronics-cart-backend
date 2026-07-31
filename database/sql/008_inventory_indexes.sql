-- Electronics Cart — Phase 3 Inventory indexes
-- File: 008_inventory_indexes.sql

BEGIN;

-- warehouses + hierarchy
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouses_code_active
  ON warehouses (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouses_manager ON warehouses (manager_user_id) WHERE manager_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_zones_wh_code_active
  ON warehouse_zones (warehouse_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_warehouse_id
  ON warehouse_zones (warehouse_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_racks_zone_code_active
  ON warehouse_racks (zone_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouse_racks_zone_id
  ON warehouse_racks (zone_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_bins_rack_code_active
  ON warehouse_bins (rack_id, code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_bins_barcode_active
  ON warehouse_bins (barcode) WHERE barcode IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouse_bins_rack_id
  ON warehouse_bins (rack_id) WHERE deleted_at IS NULL;

-- suppliers
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_slug_active
  ON suppliers (slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_gst_active
  ON suppliers (gst_number) WHERE gst_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier_id
  ON supplier_contacts (supplier_id) WHERE deleted_at IS NULL;

-- inventory
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_bin_variant_active
  ON inventory (bin_id, variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON inventory (variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON inventory (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_bin_id ON inventory (bin_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_variant
  ON inventory (warehouse_id, variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
  ON inventory (warehouse_id, variant_id)
  WHERE deleted_at IS NULL AND available_quantity <= reorder_level;

-- movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_wh_time
  ON inventory_movements (warehouse_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_time
  ON inventory_movements (variant_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type
  ON inventory_movements (movement_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref
  ON inventory_movements (reference_type, reference_id)
  WHERE reference_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_serial
  ON inventory_movements (serial_number_id) WHERE serial_number_id IS NOT NULL;

-- reservations
CREATE INDEX IF NOT EXISTS idx_stock_reservations_wh_variant
  ON stock_reservations (warehouse_id, variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires_at
  ON stock_reservations (expires_at) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status
  ON stock_reservations (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_reservations_cart_id
  ON stock_reservations (cart_id) WHERE cart_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order_id
  ON stock_reservations (order_id) WHERE order_id IS NOT NULL AND deleted_at IS NULL;

-- serial numbers
CREATE UNIQUE INDEX IF NOT EXISTS uq_serial_numbers_serial_active
  ON serial_numbers (serial_number) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_serial_numbers_imei_active
  ON serial_numbers (imei) WHERE imei IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_serial_numbers_barcode_active
  ON serial_numbers (barcode) WHERE barcode IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_serial_numbers_variant_id ON serial_numbers (variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_serial_numbers_warehouse_id ON serial_numbers (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_serial_numbers_bin_id ON serial_numbers (bin_id) WHERE bin_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_serial_numbers_batch_id ON serial_numbers (batch_id) WHERE batch_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_serial_numbers_status ON serial_numbers (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_serial_numbers_refurb
  ON serial_numbers (refurbishment_status) WHERE refurbishment_status IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_serial_numbers_po_item
  ON serial_numbers (purchase_order_item_id) WHERE purchase_order_item_id IS NOT NULL;

-- purchase orders
CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_orders_po_number_active
  ON purchase_orders (po_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders (supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_warehouse_id ON purchase_orders (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items (purchase_order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_variant_id ON purchase_order_items (variant_id) WHERE deleted_at IS NULL;

-- goods receipts
CREATE UNIQUE INDEX IF NOT EXISTS uq_goods_receipts_grn_number_active
  ON goods_receipts (grn_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po_id ON goods_receipts (purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goods_receipts_supplier_id ON goods_receipts (supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goods_receipts_warehouse_id ON goods_receipts (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goods_receipts_status ON goods_receipts (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_grn_id ON goods_receipt_items (goods_receipt_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goods_receipt_items_variant_id ON goods_receipt_items (variant_id) WHERE deleted_at IS NULL;

-- transfers
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_transfers_number_active
  ON stock_transfers (transfer_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_transfers_from ON stock_transfers (from_warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_transfers_to ON stock_transfers (to_warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer_id ON stock_transfer_items (stock_transfer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_variant_id ON stock_transfer_items (variant_id) WHERE deleted_at IS NULL;

-- adjustments / batches / cost / returns / forecast / scorecards / capacity / cycle / alerts
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_warehouse_id ON inventory_adjustments (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_variant_id ON inventory_adjustments (variant_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_batches_wh_batch_active
  ON inventory_batches (warehouse_id, batch_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_batches_warehouse_id ON inventory_batches (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_batches_bin_id ON inventory_batches (bin_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_batches_variant_id ON inventory_batches (variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_batches_supplier_id ON inventory_batches (supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry_date ON inventory_batches (expiry_date) WHERE expiry_date IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_cost_history_variant_from
  ON purchase_cost_history (variant_id, effective_from DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_cost_history_supplier_id
  ON purchase_cost_history (supplier_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_return_to_stock_warehouse_id ON return_to_stock (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_return_to_stock_variant_id ON return_to_stock (variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_return_to_stock_source ON return_to_stock (source) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_return_to_stock_status ON return_to_stock (status) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_forecast_variant_date_active
  ON inventory_forecast (variant_id, forecast_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_forecast_variant_date
  ON inventory_forecast (variant_id, forecast_date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_supplier_scored
  ON supplier_scorecards (supplier_id, scored_on DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_capacity_warehouse_active
  ON warehouse_capacity (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warehouse_capacity_warehouse_id
  ON warehouse_capacity (warehouse_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cycle_count_jobs_number_active
  ON cycle_count_jobs (job_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cycle_count_jobs_warehouse_id ON cycle_count_jobs (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cycle_count_jobs_status ON cycle_count_jobs (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cycle_count_items_job_id ON cycle_count_items (cycle_count_job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cycle_count_items_bin_id ON cycle_count_items (bin_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cycle_count_items_variant_id ON cycle_count_items (variant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_wh_variant ON low_stock_alerts (warehouse_id, variant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_status ON low_stock_alerts (status) WHERE deleted_at IS NULL AND status = 'open';

COMMIT;
