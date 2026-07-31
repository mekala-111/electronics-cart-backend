-- Electronics Cart — sequences
SELECT
  sequencename AS sequence_name,
  data_type,
  start_value,
  min_value,
  max_value,
  increment_by
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY 1;
