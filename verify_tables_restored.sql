-- Проверка восстановления таблиц
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем, что все таблицы созданы
SELECT 
  'Table Restoration Check' as check_type,
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = t.table_name
        AND table_type = 'BASE TABLE'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (VALUES 
  ('trainer_territories_log'),
  ('user_activity_logs')
) AS t(table_name)
ORDER BY table_name;

-- 2. Проверяем структуру созданных таблиц
SELECT 
  'Table Structure Check' as check_type,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('trainer_territories_log', 'user_activity_logs')
ORDER BY table_name, ordinal_position;

-- 3. Проверяем индексы
SELECT 
  'Indexes Check' as check_type,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('trainer_territories_log', 'user_activity_logs')
ORDER BY tablename, indexname;

-- 4. Проверяем триггеры
SELECT 
  'Triggers Check' as check_type,
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname LIKE '%trainer_territories%'
ORDER BY tgname;

-- 5. Проверяем RLS политики
SELECT 
  'RLS Policies Check' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('trainer_territories_log', 'user_activity_logs')
ORDER BY tablename, policyname;

-- 6. Общий подсчет таблиц
SELECT 
  'Final Table Count' as info,
  COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
