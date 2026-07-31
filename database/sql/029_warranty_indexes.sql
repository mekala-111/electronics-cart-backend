-- Electronics Cart — Phase 7 Warranty indexes
-- File: 029_warranty_indexes.sql

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warranty_providers_code_active
  ON warranty_providers (code) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warranty_plans_provider_code_active
  ON warranty_plans (provider_id, code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_plans_provider_id
  ON warranty_plans (provider_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_plans_plan_type
  ON warranty_plans (plan_type) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warranty_registrations_number_active
  ON warranty_registrations (registration_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_customer_id
  ON warranty_registrations (customer_id) WHERE customer_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_serial_number_id
  ON warranty_registrations (serial_number_id) WHERE serial_number_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_status
  ON warranty_registrations (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_created_at
  ON warranty_registrations (created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_warranty_extensions_registration_id
  ON warranty_extensions (registration_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warranty_claims_number_active
  ON warranty_claims (claim_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_claims_registration_id
  ON warranty_claims (registration_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status
  ON warranty_claims (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_claims_created_at
  ON warranty_claims (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_claims_serial_number_id
  ON warranty_claims (serial_number_id) WHERE serial_number_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_claim_documents_claim_id
  ON claim_documents (claim_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_warranty_status_history_claim_id
  ON warranty_status_history (claim_id, changed_at DESC) WHERE claim_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_warranty_status_history_registration_id
  ON warranty_status_history (registration_id, changed_at DESC) WHERE registration_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_centers_code_active
  ON service_centers (code) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_center_locations_center_id
  ON service_center_locations (service_center_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_employee_code_active
  ON technicians (employee_code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_technicians_user_center_active
  ON technicians (user_id, service_center_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_technicians_service_center_id
  ON technicians (service_center_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_technicians_user_id
  ON technicians (user_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_technician_skills_tech_code_active
  ON technician_skills (technician_id, skill_code) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_tickets_number_active
  ON service_tickets (ticket_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_status
  ON service_tickets (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_technician_id
  ON service_tickets (technician_id) WHERE technician_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_created_at
  ON service_tickets (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_serial_number_id
  ON service_tickets (serial_number_id) WHERE serial_number_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_customer_id
  ON service_tickets (customer_id) WHERE customer_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_claim_id
  ON service_tickets (claim_id) WHERE claim_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_status_history_ticket_id
  ON ticket_status_history (ticket_id, changed_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_ticket_id
  ON diagnostic_reports (ticket_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_repair_jobs_number_active
  ON repair_jobs (repair_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_repair_jobs_ticket_id
  ON repair_jobs (ticket_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_repair_jobs_technician_id
  ON repair_jobs (technician_id) WHERE technician_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_repair_jobs_created_at
  ON repair_jobs (created_at DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_repair_parts_sku_active
  ON repair_parts (sku) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_repair_part_usage_repair_job_id
  ON repair_part_usage (repair_job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_repair_part_usage_serial_number_id
  ON repair_part_usage (serial_number_id) WHERE serial_number_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_replacement_requests_number_active
  ON replacement_requests (request_number) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_replacement_items_request_id
  ON replacement_items (replacement_request_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rma_requests_number_active
  ON rma_requests (rma_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rma_requests_status
  ON rma_requests (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rma_requests_serial_number_id
  ON rma_requests (serial_number_id) WHERE serial_number_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rma_requests_created_at
  ON rma_requests (created_at DESC) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_trade_in_requests_number_active
  ON trade_in_requests (request_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trade_in_requests_status
  ON trade_in_requests (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trade_in_requests_created_at
  ON trade_in_requests (created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trade_in_evaluations_request_id
  ON trade_in_evaluations (trade_in_request_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_feedback_ticket_id
  ON service_feedback (ticket_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_documents_ticket_id
  ON service_documents (ticket_id) WHERE ticket_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_documents_claim_id
  ON service_documents (claim_id) WHERE claim_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_audit_logs_ticket_id
  ON service_audit_logs (ticket_id, created_at DESC) WHERE ticket_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_audit_logs_claim_id
  ON service_audit_logs (claim_id, created_at DESC) WHERE claim_id IS NOT NULL AND deleted_at IS NULL;

COMMIT;
