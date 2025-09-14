-- Исправление RLS политик для аутентификации
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем текущие RLS политики для таблицы users
SELECT 
    'Current RLS Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 2. Временно отключаем RLS для таблицы users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. Удаляем все существующие политики для users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.users;

-- 4. Создаем простые и безопасные RLS политики
-- Политика для чтения: все аутентифицированные пользователи могут читать всех пользователей
CREATE POLICY "authenticated_users_can_read_all_users" ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Политика для обновления: пользователи могут обновлять только свой профиль
CREATE POLICY "users_can_update_own_profile" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Политика для вставки: только аутентифицированные пользователи могут создавать записи
CREATE POLICY "authenticated_users_can_insert_users" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Политика для удаления: только администраторы могут удалять пользователей
CREATE POLICY "admins_can_delete_users" ON public.users
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('administrator', 'moderator')
        )
    );

-- 5. Включаем RLS обратно
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Проверяем новые политики
SELECT 
    'New RLS Policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 7. Проверяем, что пользователь может быть найден
SELECT 
    'User Check' as status,
    id,
    email,
    full_name,
    role,
    status as user_status
FROM public.users 
WHERE email = 'doirp@sns.ru';

-- 8. Тестируем простой запрос к пользователям
SELECT 
    'Test Query' as status,
    COUNT(*) as user_count
FROM public.users;
