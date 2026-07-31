-- Electronics Cart — Phase 7 Warranty extension indexes
-- File: 032_warranty_extension_indexes.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_contracts_number_active
  ON service_contracts (contract_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_contracts_customer_id
  ON service_contracts (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_contracts_status
  ON service_contracts (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contract_items_contract_id
  ON contract_items (contract_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contract_items_serial_number_id
  ON contract_items (serial_number_id) WHERE serial_number_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contract_renewals_contract_id
  ON contract_renewals (contract_id, renewed_at DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_spare_part_suppliers_code_active
  ON spare_part_suppliers (code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_spare_part_suppliers_inventory_supplier_id
  ON spare_part_suppliers (inventory_supplier_id)
  WHERE inventory_supplier_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_part_catalog_supplier_sku_active
  ON supplier_part_catalog (spare_part_supplier_id, supplier_sku) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_part_catalog_repair_part_id
  ON supplier_part_catalog (repair_part_id) WHERE repair_part_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_technician_certifications_technician_id
  ON technician_certifications (technician_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_technician_certifications_expiry_date
  ON technician_certifications (expiry_date) WHERE expiry_date IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_repair_metrics_ticket_active
  ON repair_metrics (ticket_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_device_health_reports_serial_number_id
  ON device_health_reports (serial_number_id) WHERE serial_number_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_device_health_reports_ticket_id
  ON device_health_reports (ticket_id) WHERE ticket_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_device_health_reports_trade_in_request_id
  ON device_health_reports (trade_in_request_id)
  WHERE trade_in_request_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_sla_code_active
  ON service_sla (code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_service_sla_priority_active
  ON service_sla (priority) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_tickets_service_sla_id
  ON service_tickets (service_sla_id) WHERE service_sla_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_loan_devices_asset_tag_active
  ON loan_devices (asset_tag) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loan_devices_status
  ON loan_devices (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loan_devices_serial_number_id
  ON loan_devices (serial_number_id) WHERE serial_number_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_loan_allocations_loan_device_id
  ON loan_allocations (loan_device_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loan_allocations_ticket_id
  ON loan_allocations (ticket_id) WHERE ticket_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loan_allocations_status
  ON loan_allocations (status) WHERE deleted_at IS NULL;

COMMIT;
