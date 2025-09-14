-- Упрощенная проверка таблиц в Supabase
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Список всех существующих таблиц
SELECT 
  'Existing Tables' as info,
  table_name,
  'BASE TABLE' as type
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Список всех представлений (views)
SELECT 
  'Existing Views' as info,
  table_name,
  'VIEW' as type
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. Проверка критически важных таблиц
SELECT 
  'Critical Tables Check' as check_type,
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
  ('users'),
  ('events'),
  ('event_participants'),
  ('event_types'),
  ('branches'),
  ('territories'),
  ('positions'),
  ('tests'),
  ('test_questions'),
  ('test_answers'),
  ('user_test_attempts'),
  ('user_test_answers'),
  ('admin_logs'),
  ('notification_tasks'),
  ('system_settings')
) AS t(table_name)
ORDER BY table_name;

-- 4. Проверка таблиц обратной связи
SELECT 
  'Feedback Tables Check' as check_type,
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
  ('feedback_templates'),
  ('feedback_questions'),
  ('feedback_submissions'),
  ('feedback_answers')
) AS t(table_name)
ORDER BY table_name;

-- 5. Проверка таблиц тестирования
SELECT 
  'Testing Tables Check' as check_type,
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
  ('test_sequence_answers'),
  ('test_answer_reviews'),
  ('tp_evaluations')
) AS t(table_name)
ORDER BY table_name;

-- 6. Проверка системных таблиц
SELECT 
  'System Tables Check' as check_type,
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
  ('trainer_territories'),
  ('trainer_territories_log'),
  ('user_activity_logs'),
  ('user_logs'),
  ('user_qr_tokens'),
  ('event_files')
) AS t(table_name)
ORDER BY table_name;

-- 7. Проверка представления event_participants_view
SELECT 
  'Views Check' as check_type,
  'event_participants_view' as view_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND table_name = 'event_participants_view'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 8. Подсчет общего количества таблиц
SELECT 
  'Summary' as info,
  'Total Tables' as metric,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
  'Summary' as info,
  'Total Views' as metric,
  COUNT(*) as count
FROM information_schema.views 
WHERE table_schema = 'public';
