-- Electronics Cart — Phase 6 Shipping extension indexes
-- File: 026_shipping_extension_indexes.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_carrier_sla_partner_service_active
  ON carrier_sla (partner_id, service_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_carrier_sla_partner_id
  ON carrier_sla (partner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_carrier_sla_success_rate
  ON carrier_sla (success_rate DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shipment_insurance_shipment_active
  ON shipment_insurance (shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shipment_insurance_claim_status
  ON shipment_insurance (claim_status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_slots_shipment_id
  ON delivery_slots (shipment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_slots_window
  ON delivery_slots (slot_start, slot_end) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pickup_points_partner_code_active
  ON pickup_points (partner_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pickup_points_partner_id
  ON pickup_points (partner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pickup_points_postal_code
  ON pickup_points (postal_code) WHERE postal_code IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_cost_breakdown_shipment_active
  ON shipping_cost_breakdown (shipment_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_failure_reasons_code_active
  ON delivery_failure_reasons (code) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipment_eta_history_shipment_id
  ON shipment_eta_history (shipment_id, updated_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_failure_reason_id
  ON delivery_attempts (failure_reason_id) WHERE failure_reason_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_pickup_point_id
  ON shipments (pickup_point_id) WHERE pickup_point_id IS NOT NULL AND deleted_at IS NULL;

COMMIT;
