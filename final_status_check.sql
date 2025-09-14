-- Финальная проверка статуса восстановления
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем RPC функции
SELECT 
    'RPC Functions Status' as check_type,
    proname as function_name,
    CASE 
        WHEN proname IN ('rpc_bootstrap_admin', 'rpc_create_user', 'rpc_create_user_safe', 'rpc_sync_all_users_to_auth', 'rpc_delete_user_complete', 'rpc_repair_user_auth', 'rpc_delete_auth_user')
        THEN '✅ CRITICAL'
        WHEN proname LIKE 'rpc_%'
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname LIKE 'rpc_%'
ORDER BY proname;

-- 2. Проверяем функции обратной связи
SELECT 
    'Feedback Functions Status' as check_type,
    proname as function_name,
    CASE 
        WHEN proname IN ('get_feedback_templates_for_event', 'submit_feedback', 'can_user_submit_feedback', 'get_event_feedback_stats', 'get_user_feedback_submissions')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname LIKE '%feedback%'
ORDER BY proname;

-- 3. Проверяем таблицы обратной связи
SELECT 
    'Feedback Tables Status' as check_type,
    table_name,
    CASE 
        WHEN table_name IN ('feedback_templates', 'feedback_questions', 'feedback_submissions', 'feedback_answers')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
    AND table_name LIKE 'feedback%'
ORDER BY table_name;

-- 4. Проверяем представления
SELECT 
    'Views Status' as check_type,
    table_name,
    '✅ EXISTS' as status
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 5. Проверяем RLS политики
SELECT 
    'RLS Policies Status' as check_type,
    COUNT(*) as total_policies,
    '✅ ACTIVE' as status
FROM pg_policies 
WHERE schemaname = 'public';

-- 6. Проверяем общее количество таблиц
SELECT 
    'Database Status' as check_type,
    COUNT(*) as total_tables,
    '✅ READY' as status
FROM information_schema.tables 
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

-- 7. Тестируем создание администратора
SELECT 'Testing rpc_bootstrap_admin...' as test_status;
SELECT rpc_bootstrap_admin() as bootstrap_result;
