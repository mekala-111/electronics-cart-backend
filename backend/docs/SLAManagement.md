# SLA Management

- Ticket SLA rows: `service_sla` linked on `service_tickets.service_sla_id`
- Case definitions supply default response/resolve minutes + priority multipliers
- `CaseManager.evaluateSla` used by BullMQ jobs `warranty.sla.monitor` / `warranty.escalation`
- Breach emits case SLA events; warranty worker logs expiry reminder candidates (`warranty.expiry.reminder`)
