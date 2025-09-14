-- Исправление провайдеров для пользователя doirp@sns.ru
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем текущее состояние пользователя в auth.users
SELECT 
    'Current Auth User' as check_type,
    id,
    email,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'doirp@sns.ru';

-- 2. Обновляем провайдеры для пользователя
UPDATE auth.users 
SET 
    raw_app_meta_data = '{"provider": "email", "providers": ["email"]}',
    raw_user_meta_data = json_build_object(
        'full_name', 'Кадочкин Максим',
        'role', 'administrator',
        'sap_number', '7777777'
    ),
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'doirp@sns.ru';

-- 3. Проверяем результат
SELECT 
    'Updated Auth User' as check_type,
    id,
    email,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'doirp@sns.ru';

-- 4. Также проверим, что пользователь синхронизирован
SELECT 
    'Sync Check' as status,
    au.id as auth_id,
    au.email as auth_email,
    au.raw_app_meta_data,
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
WHERE au.email = 'doirp@sns.ru' OR pu.email = 'doirp@sns.ru';
