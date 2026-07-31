# Loan Device Flow

1. Device must be `loan_devices.status = available`
2. `POST /api/admin/service/loan-devices` (idempotent + lock)
3. Transaction: device → `allocated`, create `loan_allocations` (`active`)
4. Event: `loan_device.allocated`
5. Audit: `loan.allocate`
