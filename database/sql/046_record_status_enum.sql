-- Electronics Cart — Enum naming guard / cleanup
-- File: 046_record_status_enum.sql
--
-- Prisma maps enum RecordStatus → public.record_status (@@map).
-- SQL creates public.record_status in 001_initial.sql.
-- Some environments also created a PascalCase "RecordStatus" ghost type
-- (Prisma client without @@map). This migration:
--   1) requires public.record_status
--   2) reassigns any columns off "RecordStatus" → record_status
--   3) drops the PascalCase duplicate

DO $$
DECLARE
  r RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'record_status'
      AND t.typtype = 'e'
  ) THEN
    RAISE EXCEPTION
      'Missing required enum public.record_status — apply 001_initial.sql before 046';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'RecordStatus'
      AND t.typtype = 'e'
  ) THEN
    FOR r IN
      SELECT
        n.nspname AS schema_name,
        c.relname AS table_name,
        a.attname AS column_name
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_type t ON t.oid = a.atttypid
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND a.attnum > 0
        AND NOT a.attisdropped
        AND t.typname = 'RecordStatus'
    LOOP
      EXECUTE format(
        'ALTER TABLE %I.%I ALTER COLUMN %I TYPE record_status USING %I::text::record_status',
        r.schema_name,
        r.table_name,
        r.column_name,
        r.column_name
      );
    END LOOP;

    DROP TYPE "RecordStatus";
  END IF;
END
$$;
