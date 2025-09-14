-- Проверка таблицы user_test_attempts
-- Выполните в Supabase SQL Editor

-- 1. Проверяем, существует ли таблица
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'user_test_attempts' 
  AND table_schema = 'public';

-- 2. Если таблица существует, проверяем её структуру
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable",
  column_default as "По умолчанию"
FROM information_schema.columns 
WHERE table_name = 'user_test_attempts' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;

-- 3. Проверяем RLS политики
SELECT 
  policyname as "Политика",
  cmd as "Команда",
  roles as "Роли"
FROM pg_policies 
WHERE tablename = 'user_test_attempts' AND schemaname = 'public';

-- 4. Проверяем, включен ли RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS включен"
FROM pg_tables 
WHERE tablename = 'user_test_attempts' AND schemaname = 'public';
