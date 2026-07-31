# Case Management Framework

Shared layer: `backend/src/shared/case-management/`

Standardizes long-running customer service cases **without** a shared `cases` table (schema locked). Domains persist via a `CaseStore` adapter onto existing tables (`warranty_claims`, `rma_requests`, `service_tickets`, …).

## Features

| Capability | How |
|---|---|
| Lifecycle | `StateMachineEngine` + per-kind definition |
| Assignment | `CaseManager.assign` → store + `case.assigned` |
| Priority / SLA | `CaseSlaPolicy` + `computeDueAt` / breach helpers |
| Notes / attachments | Store callbacks (metadata only for files) |
| Escalation | Rules on definition + `evaluateSla` |
| Timeline | `appendTimeline` / `listTimeline` |
| Events | `case.opened\|status_changed\|assigned\|note_added\|escalated\|sla_breached\|closed` |

## Case kinds

`warranty_claim` · `rma` · `service_ticket` · `repair_job` · `support`

Bundled graphs reuse existing state machines where available; `support` / `repair_job` use `supportCaseStateMachine`.

## Usage (Warranty later)

```ts
// In WarrantyModule
this.caseManager.registerStore('warranty_claim', this.warrantyCaseStore);

await this.caseManager.transition(
  { kind: 'warranty_claim', id: claim.id },
  'under_review',
  { actorId: userId, reason: 'Intake complete' },
);

await this.caseManager.assign(ref, technicianId, userId);
await this.caseManager.addNote(ref, { body: 'Board failure', actorId: userId });
await this.caseManager.evaluateSla(ref);
```

## Default store

`InMemoryCaseStore` is registered for `support` and `repair_job` (tests / interim support incidents). Production Warranty/Service modules must register Prisma-backed stores.

## Does not

- Create tables or alter Prisma schema
- Start the Warranty & Service module
