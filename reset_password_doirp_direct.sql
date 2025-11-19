-- Прямой сброс пароля для doirp.sns777@gmail.com
-- ВНИМАНИЕ: В Supabase нельзя напрямую обновить encrypted_password через SQL
-- Нужно использовать Admin API через Edge Function или Supabase Dashboard

-- Вариант 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)
-- 1. Откройте Supabase Dashboard
-- 2. Перейдите в Authentication > Users
-- 3. Найдите пользователя doirp.sns777@gmail.com
-- 4. Нажмите на пользователя
-- 5. В разделе "Password" нажмите "Reset Password" или введите новый пароль: 123456
-- 6. Сохраните изменения

-- Вариант 2: Через Supabase CLI (если установлен)
-- supabase auth admin update-user f10774ae-754d-4b44-92a4-a57a2ece733c --password 123456

-- Вариант 3: Через Edge Function (требует авторизации администратора)
-- POST https://oaockmesooydvausfoca.supabase.co/functions/v1/reset-password
-- Headers: 
--   Authorization: Bearer <service_role_key или admin_token>
--   Content-Type: application/json
-- Body: 
--   {
--     "userId": "f10774ae-754d-4b44-92a4-a57a2ece733c",
--     "email": "doirp.sns777@gmail.com"
--   }

-- Проверяем текущее состояние
SELECT 
    'Проверка пользователя' as action,
    id,
    email,
    email_confirmed_at IS NOT NULL as email_confirmed,
    encrypted_password IS NOT NULL as has_password,
    updated_at
FROM auth.users
WHERE email = 'doirp.sns777@gmail.com';

-- Обновляем email_verified в identity (может помочь)
UPDATE auth.identities
SET 
    identity_data = jsonb_set(
        identity_data,
        '{email_verified}',
        'true'::jsonb
    ),
    updated_at = NOW()
WHERE user_id = 'f10774ae-754d-4b44-92a4-a57a2ece733c'
  AND provider = 'email';

-- Проверяем результат
SELECT 
    'Проверка identity после обновления' as action,
    id,
    user_id,
    provider,
    identity_data->>'email_verified' as email_verified,
    updated_at
FROM auth.identities
WHERE user_id = 'f10774ae-754d-4b44-92a4-a57a2ece733c';

