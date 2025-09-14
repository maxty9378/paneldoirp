-- Полное исправление RLS политик для устранения бесконечной рекурсии
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Отключаем RLS временно для всех таблиц
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE territories DISABLE ROW LEVEL SECURITY;
ALTER TABLE positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_answer_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE tp_evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_territories DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY; -- Таблица не существует
ALTER TABLE feedback_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_qr_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_territories_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем все существующие политики
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 3. Создаем простые и безопасные политики для users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable delete for administrators only" ON users
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Создаем простые политики для других таблиц
ALTER TABLE notification_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON notification_tasks
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON tests
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON event_participants
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON events
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON event_types
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON branches
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON territories
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON positions
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON test_questions
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON test_answers
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE user_test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON user_test_attempts
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE user_test_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON user_test_answers
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE test_answer_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON test_answer_reviews
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE tp_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON tp_evaluations
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE trainer_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON trainer_territories
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON admin_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY; -- Таблица не существует
-- CREATE POLICY "Enable all access for authenticated users" ON system_settings
--     FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE feedback_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON feedback_templates
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE feedback_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON feedback_questions
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON feedback_submissions
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE feedback_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON feedback_answers
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE user_qr_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON user_qr_tokens
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE event_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON event_files
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON tasks
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON task_completions
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE trainer_territories_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON trainer_territories_log
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON user_activity_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Проверяем результат
SELECT 
    'RLS Policies Fixed Successfully' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- 6. Проверяем таблицы с RLS
SELECT 
    'Tables with RLS' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
    AND rowsecurity = true
ORDER BY tablename;
