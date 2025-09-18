-- Проверяем пользователей в auth.users
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'doirp@sns.ru'
ORDER BY created_at DESC;

-- Проверяем всех пользователей
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;
