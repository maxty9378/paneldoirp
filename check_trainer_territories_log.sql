-- Проверка таблицы trainer_territories_log
-- Выполните в Supabase SQL Editor

-- 1. Проверяем, существует ли таблица
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'trainer_territories_log' 
  AND table_schema = 'public';

-- 2. Если таблица существует, проверяем её структуру
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'trainer_territories_log' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;

-- 3. Проверяем, есть ли данные в таблице
SELECT COUNT(*) as "Количество записей" 
FROM public.trainer_territories_log;

-- 4. Проверяем RLS политики
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'trainer_territories_log';
