-- Проверка структуры таблицы territories
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'territories' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;
