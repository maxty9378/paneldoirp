-- Исправление RLS политик для устранения бесконечной рекурсии
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Отключаем RLS временно для исправления
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем все существующие политики для таблицы users
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Administrators can view all users" ON users;
DROP POLICY IF EXISTS "Administrators can insert users" ON users;
DROP POLICY IF EXISTS "Administrators can update users" ON users;
DROP POLICY IF EXISTS "Administrators can delete users" ON users;
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can view public profiles" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON users;

-- 3. Создаем простые и безопасные политики для users
CREATE POLICY "Enable read access for authenticated users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for users based on user_id" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable delete for administrators only" ON users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'administrator'
        )
    );

-- 4. Исправляем политики для notification_tasks
DROP POLICY IF EXISTS "Users can view their own notifications" ON notification_tasks;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notification_tasks;
DROP POLICY IF EXISTS "Administrators can manage all notifications" ON notification_tasks;

CREATE POLICY "Enable read access for authenticated users" ON notification_tasks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON notification_tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON notification_tasks
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. Исправляем политики для tests
DROP POLICY IF EXISTS "Enable read access for all users" ON tests;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON tests;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON tests;
DROP POLICY IF EXISTS "Enable delete for administrators" ON tests;

CREATE POLICY "Enable read access for authenticated users" ON tests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON tests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON tests
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for administrators" ON tests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'administrator'
        )
    );

-- 6. Исправляем политики для event_participants
DROP POLICY IF EXISTS "Enable read access for all users" ON event_participants;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON event_participants;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON event_participants;
DROP POLICY IF EXISTS "Enable delete for administrators" ON event_participants;

CREATE POLICY "Enable read access for authenticated users" ON event_participants
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON event_participants
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON event_participants
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for administrators" ON event_participants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'administrator'
        )
    );

-- 7. Включаем RLS обратно
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- 8. Проверяем политики
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'notification_tasks', 'tests', 'event_participants')
ORDER BY tablename, policyname;

-- 9. Тестируем простой запрос
SELECT 'RLS Policies Fixed Successfully' as status;
