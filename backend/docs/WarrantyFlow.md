# Warranty Flow

1. Customer looks up serial: `GET /api/warranty/check/:serial`
2. Registers plan: `POST /api/warranty/register` (idempotent, lock)
3. Serial `warranty_status` → `active`; history row written
4. Event: `warranty.registered`
5. Optional extend: `POST /api/admin/warranty/extend` → `warranty_extensions` + push `end_date`
6. Optional transfer: `POST /api/admin/warranty/transfer`

Eligibility: plan active, serial exists, no overlapping active registration, order ownership when `orderId` provided.
