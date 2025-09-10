-- Ищем триггеры для таблицы user_test_attempts
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_test_attempts'
ORDER BY trigger_name;

-- Ищем функции, которые могут вызывать ошибку P0001
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%P0001%' 
   OR routine_definition LIKE '%Тест уже пройден%'
ORDER BY routine_name;

-- Проверяем, есть ли RLS политики с кастомными функциями
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_test_attempts'
AND (qual LIKE '%P0001%' OR with_check LIKE '%P0001%');
