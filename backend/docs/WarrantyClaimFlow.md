# Warranty Claim Flow

1. `POST /api/warranty/claims` — validates active registration, blocks duplicate open claims
2. Case opened (`warranty_claim`, status `submitted`)
3. Event `warranty.claim.created` + BullMQ `warranty.claim.review`
4. Admin `PATCH /api/admin/warranty/claims/:id` via **CaseManager.transition** only:
   - `under_review` → investigate
   - `approved` → event `warranty.claim.approved`
   - `rejected` → event `warranty.claim.rejected`
   - `in_service` → repair path (conceptual “repair”)
   - `closed` → settled (conceptual “completed”)

Documents: CaseManager attachments → `claim_documents`.
Notes/timeline: `warranty_status_history` + `service_audit_logs`.
