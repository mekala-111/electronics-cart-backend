# Delete Rule Validation

Generated: 2026-07-31T10:10:38Z

| FK | Expected ON DELETE | Actual | Status |
|----|--------------------|--------|--------|
| order_items → orders | CASCADE | CASCADE | PASS |
| role_permissions → roles | CASCADE | CASCADE | PASS |
| payments → orders | RESTRICT | RESTRICT | PASS |
| shipments → orders | RESTRICT | RESTRICT | PASS |
| orders → users | SET NULL | SET NULL | PASS |

Passed: 5 / Failed: 0

RESTRICT and NO ACTION are treated as equivalent for verification purposes.
