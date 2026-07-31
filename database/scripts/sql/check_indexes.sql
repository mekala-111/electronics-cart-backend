-- Electronics Cart — indexes (btree / gin / unique / partial)
SELECT
  n.nspname AS schema_name,
  t.relname AS table_name,
  i.relname AS index_name,
  am.amname AS access_method,
  ix.indisunique AS is_unique,
  ix.indisprimary AS is_primary,
  pg_get_indexdef(ix.indexrelid) AS index_def
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_am am ON am.oid = i.relam
WHERE n.nspname = 'public'
ORDER BY t.relname, i.relname;
