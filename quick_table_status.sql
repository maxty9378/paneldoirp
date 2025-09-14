-- Быстрая проверка статуса таблиц
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Список всех существующих таблиц
SELECT 
  'Existing Tables' as status,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Проверка критически важных таблиц
SELECT 
  'Critical Tables Status' as check_type,
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
  ('test_sequence_answers'),
  ('user_test_attempts'),
  ('user_test_answers'),
  ('test_answer_reviews'),
  ('admin_logs'),
  ('notification_tasks'),
  ('system_settings'),
  ('tp_evaluations'),
  ('trainer_territories'),
  ('user_logs'),
  ('event_files')
) AS t(table_name)
ORDER BY table_name;

-- 3. Проверка таблиц обратной связи
SELECT 
  'Feedback Tables Status' as check_type,
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

-- 4. Проверка дополнительных таблиц
SELECT 
  'Additional Tables Status' as check_type,
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
  ('user_activity_logs'),
  ('user_qr_tokens'),
  ('tasks'),
  ('task_completions')
) AS t(table_name)
ORDER BY table_name;
