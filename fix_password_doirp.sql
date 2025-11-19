-- Скрипт для сброса пароля doirp.sns777@gmail.com на 123456
-- ВАЖНО: Этот скрипт не может напрямую обновить пароль в auth.users
-- Пароль должен быть сброшен через Edge Function или Supabase Admin API

-- Проверяем текущее состояние пользователя
SELECT 
    'Текущее состояние пользователя' as info,
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at
FROM auth.users
WHERE email = 'doirp.sns777@gmail.com';

-- Проверяем пользователя в public.users
SELECT 
    'Пользователь в public.users' as info,
    id,
    email,
    full_name,
    role,
    status,
    is_active,
    password_changed_at
FROM public.users
WHERE email = 'doirp.sns777@gmail.com';

-- Обновляем timestamp для отслеживания
UPDATE public.users
SET password_changed_at = NOW()
WHERE email = 'doirp.sns777@gmail.com';

-- ВАЖНО: Для сброса пароля выполните один из следующих вариантов:
-- 
-- 1. Через Supabase Dashboard:
--    - Перейдите в Authentication > Users
--    - Найдите пользователя doirp.sns777@gmail.com
--    - Нажмите "Reset Password" или "Send Password Reset Email"
--    - Или вручную установите пароль через "Edit User"
--
-- 2. Через Edge Function (если у вас есть доступ к админской сессии):
--    POST /functions/v1/reset-password
--    Headers: Authorization: Bearer <admin_token>
--    Body: { "userId": "f10774ae-754d-4b44-92a4-a57a2ece733c", "email": "doirp.sns777@gmail.com" }
--
-- 3. Через Supabase CLI:
--    supabase auth admin update-user f10774ae-754d-4b44-92a4-a57a2ece733c --password 123456

