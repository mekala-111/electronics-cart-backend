-- Electronics Cart — views
SELECT table_name AS view_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY 1;
