-- Удаление дублирующегося пользователя doirp@sns.ru
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем текущих пользователей
SELECT 
    'Current Users' as check_type,
    id,
    email,
    full_name,
    role,
    created_at
FROM public.users 
WHERE email IN ('doirp@sns.ru', 'doirp.sns777@gmail.com')
ORDER BY created_at;

-- 2. Удаляем пользователя doirp@sns.ru из public.users
DELETE FROM public.users 
WHERE email = 'doirp@sns.ru';

-- 3. Удаляем пользователя doirp@sns.ru из auth.users
DELETE FROM auth.users 
WHERE email = 'doirp@sns.ru';

-- 4. Проверяем результат
SELECT 
    'Remaining Users' as check_type,
    id,
    email,
    full_name,
    role,
    created_at
FROM public.users 
WHERE email IN ('doirp@sns.ru', 'doirp.sns777@gmail.com')
ORDER BY created_at;

-- 5. Проверяем, что остался только правильный пользователь
SELECT 
    'Final Check' as status,
    COUNT(*) as user_count,
    STRING_AGG(email, ', ') as emails
FROM public.users 
WHERE email IN ('doirp@sns.ru', 'doirp.sns777@gmail.com');
