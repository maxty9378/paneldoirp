-- Скрипт для проверки отсутствующих таблиц в Supabase
-- Запустите этот скрипт в Supabase SQL Editor

-- Список всех таблиц, которые должны быть в базе данных
-- (извлечено из анализа кода и миграций)

WITH expected_tables AS (
  SELECT unnest(ARRAY[
    -- Основные таблицы пользователей и событий
    'users',
    'events', 
    'event_participants',
    'event_types',
    'branches',
    'territories',
    'positions',
    
    -- Таблицы тестирования
    'tests',
    'test_questions',
    'test_answers',
    'test_sequence_answers',
    'user_test_attempts',
    'user_test_answers',
    'test_answer_reviews',
    
    -- Таблицы обратной связи
    'feedback_templates',
    'feedback_questions', 
    'feedback_submissions',
    'feedback_answers',
    
    -- Таблицы TP оценок
    'tp_evaluations',
    
    -- Таблицы тренеров и территорий
    'trainer_territories',
    'trainer_territories_log',
    
    -- Системные таблицы
    'admin_logs',
    'notification_tasks',
    'system_settings',
    'user_activity_logs',
    'user_logs',
    'user_qr_tokens',
    
    -- Таблицы файлов
    'event_files',
    
    -- Представления (views)
    'event_participants_view'
  ]) AS table_name
),
existing_tables AS (
  SELECT table_name
  FROM information_schema.tables 
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
),
missing_tables AS (
  SELECT et.table_name
  FROM expected_tables et
  LEFT JOIN existing_tables ext ON et.table_name = ext.table_name
  WHERE ext.table_name IS NULL
),
extra_tables AS (
  SELECT ext.table_name
  FROM existing_tables ext
  LEFT JOIN expected_tables et ON ext.table_name = et.table_name
  WHERE et.table_name IS NULL
)

-- Результат проверки
SELECT 
  'Missing Tables' as status,
  COUNT(*) as count,
  string_agg(table_name, ', ' ORDER BY table_name) as tables
FROM missing_tables

UNION ALL

SELECT 
  'Extra Tables' as status,
  COUNT(*) as count,
  string_agg(table_name, ', ' ORDER BY table_name) as tables
FROM extra_tables

UNION ALL

SELECT 
  'Existing Tables' as status,
  COUNT(*) as count,
  string_agg(table_name, ', ' ORDER BY table_name) as tables
FROM existing_tables;

-- Детальная проверка каждой таблицы
SELECT 
  'Detailed Table Check' as check_type,
  et.table_name,
  CASE 
    WHEN ext.table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  SELECT unnest(ARRAY[
    -- Основные таблицы пользователей и событий
    'users',
    'events', 
    'event_participants',
    'event_types',
    'branches',
    'territories',
    'positions',
    
    -- Таблицы тестирования
    'tests',
    'test_questions',
    'test_answers',
    'test_sequence_answers',
    'user_test_attempts',
    'user_test_answers',
    'test_answer_reviews',
    
    -- Таблицы обратной связи
    'feedback_templates',
    'feedback_questions', 
    'feedback_submissions',
    'feedback_answers',
    
    -- Таблицы TP оценок
    'tp_evaluations',
    
    -- Таблицы тренеров и территорий
    'trainer_territories',
    'trainer_territories_log',
    
    -- Системные таблицы
    'admin_logs',
    'notification_tasks',
    'system_settings',
    'user_activity_logs',
    'user_logs',
    'user_qr_tokens',
    
    -- Таблицы файлов
    'event_files',
    
    -- Представления (views)
    'event_participants_view'
  ]) AS table_name
) et
LEFT JOIN (
  SELECT table_name
  FROM information_schema.tables 
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
) ext ON et.table_name = ext.table_name
ORDER BY et.table_name;

-- Проверка представлений (views)
SELECT 
  'Views Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'event_participants_view')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as event_participants_view;

-- Проверка индексов для критических таблиц
SELECT 
  'Indexes Check' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'events', 'user_test_attempts', 'event_participants')
ORDER BY tablename, indexname;

-- Проверка внешних ключей
SELECT 
  'Foreign Keys Check' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
