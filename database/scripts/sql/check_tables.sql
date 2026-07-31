-- Electronics Cart — catalog of base tables (excludes Prisma system table)
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname <> '_prisma_migrations'
ORDER BY 1;
