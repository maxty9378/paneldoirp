-- Назначение пользователя doirp.sns777@gmail.com администратором
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем текущего пользователя
SELECT 
    'Current User' as check_type,
    id,
    email,
    full_name,
    role,
    status,
    is_active,
    created_at
FROM public.users 
WHERE email = 'doirp.sns777@gmail.com';

-- 2. Обновляем роль на administrator
UPDATE public.users 
SET 
    role = 'administrator',
    status = 'active',
    is_active = true,
    updated_at = NOW()
WHERE email = 'doirp.sns777@gmail.com';

-- 3. Проверяем результат
SELECT 
    'Updated User' as check_type,
    id,
    email,
    full_name,
    role,
    status,
    is_active,
    updated_at
FROM public.users 
WHERE email = 'doirp.sns777@gmail.com';

-- 4. Также обновляем метаданные в auth.users
UPDATE auth.users 
SET 
    raw_user_meta_data = json_build_object(
        'full_name', 'Кадочкин Максим',
        'role', 'administrator',
        'sap_number', '7777777'
    ),
    updated_at = NOW()
WHERE email = 'doirp.sns777@gmail.com';

-- 5. Проверяем синхронизацию
SELECT 
    'Sync Check' as status,
    au.id as auth_id,
    au.email as auth_email,
    au.raw_user_meta_data,
    pu.id as public_id,
    pu.email as public_email,
    pu.full_name,
    pu.role,
    CASE 
        WHEN au.id = pu.id THEN '✅ SYNCED'
        ELSE '❌ NOT SYNCED'
    END as sync_status
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'doirp.sns777@gmail.com' OR pu.email = 'doirp.sns777@gmail.com';
