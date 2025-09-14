-- Синхронизация пользователей между auth.users и public.users
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущее состояние
SELECT 
    'Current State Check' as check_type,
    'Auth Users' as source,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Current State Check' as check_type,
    'Public Users' as source,
    COUNT(*) as count
FROM public.users;

-- 2. Находим несоответствия
SELECT 
    'Mismatch Check' as check_type,
    au.id as auth_id,
    au.email as auth_email,
    pu.id as public_id,
    pu.email as public_email,
    CASE 
        WHEN pu.id IS NULL THEN '❌ MISSING IN PUBLIC'
        WHEN au.id != pu.id THEN '❌ ID MISMATCH'
        WHEN au.email != pu.email THEN '❌ EMAIL MISMATCH'
        ELSE '✅ SYNCED'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
ORDER BY au.email;

-- 3. Исправляем несоответствия ID
UPDATE public.users 
SET id = au.id
FROM auth.users au
WHERE public.users.email = au.email 
    AND public.users.id != au.id;

-- 4. Создаем недостающих пользователей из auth.users
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
ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 5. Удаляем дубликаты по email (оставляем только с правильным ID)
DELETE FROM public.users 
WHERE id NOT IN (
    SELECT au.id 
    FROM auth.users au 
    WHERE au.email = public.users.email
);

-- 6. Проверяем результат
SELECT 
    'Sync Complete' as status,
    'Auth Users' as source,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Sync Complete' as status,
    'Public Users' as source,
    COUNT(*) as count
FROM public.users;

-- 7. Проверяем конкретного пользователя
SELECT 
    'User Check' as check_type,
    au.id as auth_id,
    au.email as auth_email,
    pu.id as public_id,
    pu.email as public_email,
    pu.full_name,
    pu.role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'doirp@sns.ru';
