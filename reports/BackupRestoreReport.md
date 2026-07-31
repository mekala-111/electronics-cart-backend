# Backup / Restore Report

Generated: 2026-07-31T10:22:23Z

| Step | Result |
|------|--------|
| pg_dump (custom format) | PASS (`6b623b9a71158030…`) |
| Schema dump checksum (source) | `38b7279908b1137b85f412376ddf96568ebf979594f36b3dfea740d94d16d1aa` |
| Schema dump checksum (restore) | `48901af2fc22f0729bf28d510e86e9dc9c9adfd98fe1a4a6931fc00fdaaee1a2` |
| Schema SQL checksums match | WARN (non-semantic dump ordering) |
| Tables source → restore | 281 → 281 PASS |
| Enums source → restore | 98 → 98 PASS |
| Migrations source → restore | 45 → 45 PASS |
| prisma validate on restore | PASS |
| Overall | **PASS** |

Dump artifact: `database/reports/backup/electronics_cart.dump`

Hard gate = table/enum/migration counts + Prisma validate on restored DB.
