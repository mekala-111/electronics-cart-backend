# Case Management Integration (Warranty)

Do **not** invent another workflow engine.

| Entity | Case kind | Store | State machine |
|---|---|---|---|
| Warranty claim | `warranty_claim` | `WarrantyClaimStore` | `warrantyClaimStateMachine` |
| RMA | `rma` | `RmaStore` | `rmaStateMachine` |
| Service ticket | `service_ticket` | `ServiceTicketStore` | `serviceTicketStateMachine` |
| Repair job | `repair_job` | `RepairJobStore` | `supportCaseStateMachine` |

All status changes go through `CaseManager.transition` / `assign` / notes / attachments / `evaluateSla`.
Stores registered in `WarrantyService` / `RmaService` / `ServiceOpsService` `onModuleInit`.
