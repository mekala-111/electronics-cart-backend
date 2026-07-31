# RMA Architecture

Tables: `rma_requests` (single-unit; no `rma_items` table).

## Flow

| Step | Status | API / action |
|---|---|---|
| Create | `requested` | `POST /api/warranty/rma` |
| Approve | `approved` | Admin patch + reverse pickup (`warranty_return`) |
| Ship back | `in_transit` | Admin patch |
| Receive / inspect | `received` | Admin patch |
| Complete | `completed` | Admin patch |
| Refund | saga | `POST /api/admin/warranty/rma/:id/refund` → Payments `RefundService` |
| Reject / cancel | terminal | Admin patch |

Managed exclusively through `CaseManager` + `rmaStateMachine`.
Events: `rma.created`, `rma.approved`.
