-- Проверка статуса таблицы trainer_territories
-- Выполните в Supabase SQL Editor

-- 1. Проверяем, существует ли таблица
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'trainer_territories' 
  AND table_schema = 'public';

-- 2. Проверяем структуру таблицы
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable",
  column_default as "По умолчанию"
FROM information_schema.columns 
WHERE table_name = 'trainer_territories' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;

-- 3. Проверяем RLS политики
SELECT 
  policyname as "Политика",
  cmd as "Команда",
  roles as "Роли",
  qual as "Условие"
FROM pg_policies 
WHERE tablename = 'trainer_territories' AND schemaname = 'public';

-- 4. Проверяем, включен ли RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS включен"
FROM pg_tables 
WHERE tablename = 'trainer_territories' AND schemaname = 'public';

-- 5. Проверяем внешние ключи
SELECT 
  tc.constraint_name as "Ограничение",
  kcu.column_name as "Колонка",
  ccu.table_name as "Ссылается на таблицу",
  ccu.column_name as "Ссылается на колонку"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'trainer_territories' 
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 6. Проверяем данные в таблице
SELECT COUNT(*) as "Количество записей" FROM public.trainer_territories;
