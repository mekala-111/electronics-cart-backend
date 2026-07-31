# Performance Report

Queries from `performance_queries.sql`: **6**

| # | Status | Seq scans | Notes |
| ---: | --- | --- | --- |
| 1 | OK | — | EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) |
| 2 | WARN | orders | EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) |
| 3 | WARN | shipments | EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) |
| 4 | OK | — | EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) |
| 5 | OK | — | EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) |
| 6 | OK | — | EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) |

_Seq scans emit warnings only; query errors fail verification._
