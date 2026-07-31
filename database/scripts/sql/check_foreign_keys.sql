-- Electronics Cart — foreign key constraints
SELECT
  con.conname AS constraint_name,
  rel.relname AS table_name,
  af.attname AS column_name,
  frel.relname AS foreign_table,
  afk.attname AS foreign_column,
  CASE con.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS on_delete,
  CASE con.confupdtype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS on_update
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace n ON n.oid = rel.relnamespace
JOIN pg_class frel ON frel.oid = con.confrelid
JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS fcols(attnum, ord) ON cols.ord = fcols.ord
JOIN pg_attribute af ON af.attrelid = con.conrelid AND af.attnum = cols.attnum
JOIN pg_attribute afk ON afk.attrelid = con.confrelid AND afk.attnum = fcols.attnum
WHERE con.contype = 'f'
  AND n.nspname = 'public'
ORDER BY rel.relname, con.conname, cols.ord;
