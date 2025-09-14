-- Проверка восстановления функций после выполнения restore_critical_functions.sql
-- Запустите этот скрипт в Supabase SQL Editor

-- Проверяем RPC функции
SELECT 
  'RPC Functions Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_bootstrap_admin') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as rpc_bootstrap_admin,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_create_user') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as rpc_create_user,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_create_user_safe') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as rpc_create_user_safe,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_sync_all_users_to_auth') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as rpc_sync_all_users_to_auth,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_delete_user_complete') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as rpc_delete_user_complete,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_repair_user_auth') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as rpc_repair_user_auth,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_delete_auth_user') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as rpc_delete_auth_user;

-- Проверяем другие важные функции
SELECT 
  'Other Functions Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'should_show_feedback_form') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as should_show_feedback_form,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_tp_evaluation_stats') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as get_tp_evaluation_stats,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_event_feedback_stats') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as get_event_feedback_stats,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_deployment_status') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as get_deployment_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as update_updated_at_column,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as handle_new_user;

-- Проверяем триггеры
SELECT 
  'Triggers Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as on_auth_user_created_trigger,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as update_users_updated_at_trigger,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_events_updated_at') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as update_events_updated_at_trigger,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_event_participants_updated_at') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as update_event_participants_updated_at_trigger;

-- Тестируем создание администратора
SELECT 'Testing rpc_bootstrap_admin...' as test_status;
SELECT rpc_bootstrap_admin() as bootstrap_result;

-- Тестируем создание пользователя
SELECT 'Testing rpc_create_user_safe...' as test_status;
SELECT rpc_create_user_safe(
  'test@example.com',
  'Test User',
  'employee'::user_role_enum
) as create_user_result;

-- Проверяем общее количество функций
SELECT 
  'Total Functions Count' as info,
  COUNT(*) as total_functions
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Список всех RPC функций
SELECT 
  'All RPC Functions' as info,
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname LIKE 'rpc_%'
ORDER BY proname;
