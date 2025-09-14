-- Финальное исправление RLS политик
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем все существующие политики
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        RAISE NOTICE 'Dropped policy: %.%', r.tablename, r.policyname;
    END LOOP;
END $$;

-- 2. Создаем простые политики для всех таблиц
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
    LOOP
        -- Создаем простую политику для всех операций
        EXECUTE format('CREATE POLICY "Enable all access for authenticated users" ON %I FOR ALL USING (auth.role() = ''authenticated'')', table_name);
        
        -- Для таблицы users создаем специальные политики
        IF table_name = 'users' THEN
            EXECUTE format('DROP POLICY IF EXISTS "Enable all access for authenticated users" ON %I', table_name);
            EXECUTE format('CREATE POLICY "Enable read access for authenticated users" ON %I FOR SELECT USING (auth.role() = ''authenticated'')', table_name);
            EXECUTE format('CREATE POLICY "Enable insert for authenticated users" ON %I FOR INSERT WITH CHECK (auth.role() = ''authenticated'')', table_name);
            EXECUTE format('CREATE POLICY "Enable update for users based on user_id" ON %I FOR UPDATE USING (auth.uid() = id)', table_name);
            EXECUTE format('CREATE POLICY "Enable delete for authenticated users" ON %I FOR DELETE USING (auth.role() = ''authenticated'')', table_name);
        END IF;
        
        RAISE NOTICE 'Created policies for table: %', table_name;
    END LOOP;
END $$;

-- 3. Проверяем результат
SELECT 
    'RLS Policies Fixed' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- 4. Проверяем таблицы с RLS
SELECT 
    'Tables with RLS' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
    AND rowsecurity = true
ORDER BY tablename;
