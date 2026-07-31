# Warranty & Service Architecture

Module path: `backend/src/modules/warranty/`

## Scope

Warranty registration, claims, RMA, service tickets, repair jobs, diagnostics, loan devices, spare parts — all on the **locked** Prisma schema (no migrations).

## Core integrations (read-only consumers)

| Capability | Usage |
|---|---|
| `CaseManager` | Lifecycle for claim / RMA / ticket / repair |
| `StateMachineEngine` | Via CaseManager only |
| `LockService` | Register, claim approve, assign, loan, parts |
| `EventPublisher` | Domain events listed below |
| `SagaCoordinator` | RMA refund saga |
| Redis (`CacheService`) | Plans, serial lookup, claims, centers, device history |
| BullMQ `warranty` queue | Claim review, tech assign, repair notify, SLA, expiry |
| `InventoryService` | Spare-part reservation |
| `RefundService` | RMA refund |
| `ReverseLogisticsService` | Reverse pickup on RMA approve |

## Case stores (Prisma)

Registered in `onModuleInit`:

- `WarrantyClaimStore` → `warranty_claims` + `warranty_status_history` + `claim_documents`
- `RmaStore` → `rma_requests`
- `ServiceTicketStore` → `service_tickets` + `ticket_status_history`
- `RepairJobStore` → `repair_jobs` + case status in `service_audit_logs` (`case.status`)

## Locked status graphs

**Claim:** `submitted → under_review → approved|rejected → in_service → closed` (+ cancelled)

**RMA:** `requested → approved → in_transit → received → completed` (+ rejected/cancelled)

**Ticket:** `serviceTicketStateMachine` (created → … → closed)

**Repair job:** `supportCaseStateMachine` (`open → assigned → in_progress → … → closed`) — no workflow enum on `RepairJob`

## Permissions

Bootstrapped (no SQL seed edits): `warranty.read|write`, `service.read|write` for `admin` / `super_admin`.

## Audit

All mutations write `service_audit_logs`.
