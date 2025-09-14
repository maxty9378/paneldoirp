-- Проверяем, есть ли пользователь в auth.users
SELECT 
    'Auth Users Check' as check_type,
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
WHERE email = 'doirp@sns.ru';

-- Проверяем, есть ли пользователь в public.users
SELECT 
    'Public Users Check' as check_type,
    id,
    email,
    full_name,
    role,
    created_at
FROM public.users 
WHERE email = 'doirp@sns.ru';
