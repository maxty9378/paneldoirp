-- Проверка проблем с RLS политиками
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем все RLS политики
SELECT 
    'RLS Policies Check' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. Проверяем таблицы с включенным RLS
SELECT 
    'Tables with RLS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
    AND rowsecurity = true
ORDER BY tablename;

-- 3. Проверяем проблемные политики (которые могут вызывать рекурсию)
SELECT 
    'Problematic Policies' as check_type,
    tablename,
    policyname,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
    AND (
        qual LIKE '%users%' 
        OR qual LIKE '%auth.uid()%'
        OR qual LIKE '%EXISTS%'
    )
ORDER BY tablename, policyname;

-- 4. Проверяем функции, используемые в политиках
SELECT 
    'Functions in Policies' as check_type,
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname LIKE '%user%'
ORDER BY proname;
