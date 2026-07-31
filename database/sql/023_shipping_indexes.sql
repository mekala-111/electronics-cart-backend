-- Electronics Cart — Phase 6 Shipping indexes
-- File: 023_shipping_indexes.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_partners_code_active
  ON shipping_partners (code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_partners_primary_active
  ON shipping_partners (is_primary) WHERE is_primary = TRUE AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_services_partner_code_active
  ON shipping_services (partner_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_services_partner_id
  ON shipping_services (partner_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_zones_code_active
  ON shipping_zones (code) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipping_rate_cards_partner_id
  ON shipping_rate_cards (partner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_rate_cards_effective
  ON shipping_rate_cards (effective_from, effective_to) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipping_rates_rate_card_id
  ON shipping_rates (rate_card_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_rates_zones
  ON shipping_rates (from_zone_id, to_zone_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipping_rules_priority
  ON shipping_rules (priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_rules_warehouse_id
  ON shipping_rules (warehouse_id) WHERE warehouse_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_rules_partner_id
  ON shipping_rules (partner_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pickup_schedules_warehouse_id
  ON pickup_schedules (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pickup_schedules_partner_id
  ON pickup_schedules (partner_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pickup_requests_warehouse_id
  ON pickup_requests (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pickup_requests_partner_id
  ON pickup_requests (partner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pickup_requests_status
  ON pickup_requests (status) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shipments_number_active
  ON shipments (shipment_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_order_id
  ON shipments (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_warehouse_id
  ON shipments (warehouse_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_partner_id
  ON shipments (partner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_status
  ON shipments (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_created_at
  ON shipments (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number
  ON shipments (tracking_number) WHERE tracking_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_awb_number
  ON shipments (awb_number) WHERE awb_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_fulfillment_order_id
  ON shipments (fulfillment_order_id) WHERE fulfillment_order_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_request_id
  ON shipments (pickup_request_id) WHERE pickup_request_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shipment_packages_number_active
  ON shipment_packages (shipment_id, package_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_packages_shipment_id
  ON shipment_packages (shipment_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment_id
  ON shipment_items (shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_items_order_item_id
  ON shipment_items (order_item_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_items_package_id
  ON shipment_items (package_id) WHERE package_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_awb_numbers_partner_awb_active
  ON awb_numbers (partner_id, awb_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_awb_numbers_awb_number
  ON awb_numbers (awb_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_awb_numbers_shipment_id
  ON awb_numbers (shipment_id) WHERE shipment_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_awb_numbers_status
  ON awb_numbers (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_labels_shipment_id
  ON shipment_labels (shipment_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shipment_tracking_shipment_active
  ON shipment_tracking (shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_status
  ON shipment_tracking (current_status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment_id
  ON tracking_events (shipment_id, occurred_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_events_status
  ON tracking_events (event_status) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_attempts_shipment_number_active
  ON delivery_attempts (shipment_id, attempt_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_shipment_id
  ON delivery_attempts (shipment_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_shipment_id
  ON delivery_proofs (shipment_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reverse_shipments_number_active
  ON reverse_shipments (reverse_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reverse_shipments_order_id
  ON reverse_shipments (order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reverse_shipments_return_id
  ON reverse_shipments (return_id) WHERE return_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reverse_shipments_status
  ON reverse_shipments (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reverse_shipments_tracking_number
  ON reverse_shipments (tracking_number) WHERE tracking_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reverse_shipments_awb_number
  ON reverse_shipments (awb_number) WHERE awb_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rto_shipments_forward_shipment_id
  ON rto_shipments (forward_shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rto_shipments_status
  ON rto_shipments (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rto_shipments_awb_number
  ON rto_shipments (awb_number) WHERE awb_number IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_webhooks_idempotency_active
  ON shipping_webhooks (partner_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_webhooks_partner_time
  ON shipping_webhooks (partner_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_webhooks_shipment_id
  ON shipping_webhooks (shipment_id) WHERE shipment_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_webhooks_processing_status
  ON shipping_webhooks (processing_status) WHERE deleted_at IS NULL;

COMMIT;
