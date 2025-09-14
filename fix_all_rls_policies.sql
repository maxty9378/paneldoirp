-- Полное исправление всех RLS политик
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем все таблицы с RLS
SELECT 
    'Tables with RLS' as check_type,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;

-- 2. Временно отключаем RLS для всех проблемных таблиц
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_test_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answer_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_territories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_qr_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_files DISABLE ROW LEVEL SECURITY;

-- 3. Удаляем все существующие политики
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 4. Создаем простые политики для основных таблиц

-- Users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_users" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_users" ON public.users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_events" ON public.events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_events" ON public.events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Tests table
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_tests" ON public.tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_tests" ON public.tests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_tests" ON public.tests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Notification tasks table
ALTER TABLE public.notification_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_notification_tasks" ON public.notification_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_notification_tasks" ON public.notification_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_notification_tasks" ON public.notification_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- User test attempts table
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_user_test_attempts" ON public.user_test_attempts FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_user_test_attempts" ON public.user_test_attempts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_user_test_attempts" ON public.user_test_attempts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Test questions table
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_test_questions" ON public.test_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_test_questions" ON public.test_questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_test_questions" ON public.test_questions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Test answers table
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_test_answers" ON public.test_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_test_answers" ON public.test_answers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_test_answers" ON public.test_answers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Test answer reviews table
ALTER TABLE public.test_answer_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_test_answer_reviews" ON public.test_answer_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_test_answer_reviews" ON public.test_answer_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_test_answer_reviews" ON public.test_answer_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TP evaluations table
ALTER TABLE public.tp_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_tp_evaluations" ON public.tp_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_tp_evaluations" ON public.tp_evaluations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_tp_evaluations" ON public.tp_evaluations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Trainer territories table
ALTER TABLE public.trainer_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_trainer_territories" ON public.trainer_territories FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_trainer_territories" ON public.trainer_territories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_trainer_territories" ON public.trainer_territories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Admin logs table
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_admin_logs" ON public.admin_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_admin_logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_admin_logs" ON public.admin_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Event participants table
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_event_participants" ON public.event_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_event_participants" ON public.event_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_event_participants" ON public.event_participants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 5. Проверяем результат
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
ORDER BY tablename;

-- 6. Тестируем основные запросы
SELECT 'Users Test' as test_type, COUNT(*) as count FROM public.users;
SELECT 'Events Test' as test_type, COUNT(*) as count FROM public.events;
SELECT 'Tests Test' as test_type, COUNT(*) as count FROM public.tests;
