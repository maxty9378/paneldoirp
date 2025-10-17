-- Сброс пароля для doirp.sns777@gmail.com на 123456
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем текущего пользователя
SELECT 
    'Current User' as check_type,
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'doirp.sns777@gmail.com';

-- 2. Сбрасываем пароль на 123456
UPDATE auth.users
SET 
    encrypted_password = crypt('123456', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'doirp.sns777@gmail.com';

-- 3. Проверяем результат
SELECT 
    'Password Reset Result' as status,
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    updated_at
FROM auth.users 
WHERE email = 'doirp.sns777@gmail.com';

-- 4. Проверяем пользователя в public.users
SELECT 
    'Public User' as check_type,
    id,
    email,
    full_name,
    role,
    status,
    is_active
FROM public.users 
WHERE email = 'doirp.sns777@gmail.com';

