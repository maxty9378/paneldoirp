-- =====================================================
-- ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЯ КОЛОНКИ text_answer
-- =====================================================
-- Этот скрипт проверяет, что колонка text_answer работает правильно

-- 1. Проверяем структуру таблицы
SELECT 
    'Структура таблицы user_test_answers' as test_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'user_test_answers'
    AND column_name IN ('text_answer', 'answer_text')
ORDER BY column_name;

-- 2. Проверяем RLS политики
SELECT 
    'RLS политики для user_test_answers' as test_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_test_answers'
ORDER BY policyname;

-- 3. Проверяем, что RLS включен
SELECT 
    'RLS статус' as test_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'user_test_answers';

-- 4. Проверяем индексы
SELECT 
    'Индексы для user_test_answers' as test_type,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename = 'user_test_answers'
ORDER BY indexname;
