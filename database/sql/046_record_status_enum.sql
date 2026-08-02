-- Electronics Cart — Enum naming guard
-- File: 046_record_status_enum.sql
--
-- Root cause fix is Prisma-side: enum RecordStatus @@map("record_status").
-- SQL already creates public.record_status in 001_initial.sql.
-- This migration asserts the correct type exists and rejects a PascalCase duplicate.

DO $$
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

  -- Quoted PascalCase type would appear as typname RecordStatus
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'RecordStatus'
      AND t.typtype = 'e'
  ) THEN
    RAISE EXCEPTION
      'Duplicate enum public."RecordStatus" must not exist; use public.record_status only';
  END IF;
END
$$;
