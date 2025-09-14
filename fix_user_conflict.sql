-- Исправление конфликта пользователей
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем, есть ли пользователь в auth.users но нет в public.users
SELECT 
    'Auth vs Public Users Check' as check_type,
    au.id as auth_id,
    au.email as auth_email,
    pu.id as public_id,
    pu.email as public_email,
    CASE 
        WHEN pu.id IS NULL THEN '❌ MISSING IN PUBLIC'
        ELSE '✅ EXISTS IN BOTH'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'doirp@sns.ru' -- замените на ваш email
LIMIT 5;

-- 2. Создаем недостающих пользователей из auth.users
INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    subdivision,
    status,
    is_active,
    work_experience_days,
    department,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE((au.raw_user_meta_data->>'role')::user_role_enum, 'employee'::user_role_enum),
    'management_company'::subdivision_enum,
    'active'::user_status_enum,
    true,
    0,
    'management_company',
    NOW(),
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. Проверяем результат
SELECT 
    'User Conflict Fixed' as status,
    COUNT(*) as total_users_in_public
FROM public.users;
