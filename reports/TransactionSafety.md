# Transaction Safety

Generated: 2026-07-31T10:12:07Z

| Step | Result |
|------|--------|
| Apply 001→009 | PASS |
| Simulated in-transaction failure | rolled back (exit 3) |
| Partial object leftover | none |
| Resume 010→045 | PASS |
| Migration history (45) | PASS |

PostgreSQL aborted the failed transaction; no partial DDL remained. Redeploy of remaining files succeeded.
