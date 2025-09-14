-- Создание пользователя только в auth.users
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем, есть ли пользователь в auth.users
SELECT 
    'Auth Check' as status,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'doirp@sns.ru';

-- 2. Если пользователя нет в auth.users, создаем его
DO $$
DECLARE
    auth_user_exists boolean;
    public_user_record record;
BEGIN
    -- Проверяем, есть ли пользователь в auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'doirp@sns.ru') INTO auth_user_exists;
    
    IF NOT auth_user_exists THEN
        -- Получаем данные из public.users
        SELECT * INTO public_user_record FROM public.users WHERE email = 'doirp@sns.ru';
        
        IF public_user_record IS NOT NULL THEN
            -- Создаем пользователя в auth.users с тем же ID
            INSERT INTO auth.users (
                id,
                instance_id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                is_super_admin,
                created_at,
                updated_at
            ) VALUES (
                public_user_record.id, -- Используем тот же ID
                '00000000-0000-0000-0000-000000000000',
                'authenticated',
                'authenticated',
                public_user_record.email,
                crypt('123456', gen_salt('bf')), -- Пароль 123456
                NOW(),
                '{"provider": "email", "providers": ["email"]}',
                json_build_object(
                    'full_name', public_user_record.full_name,
                    'role', public_user_record.role,
                    'sap_number', public_user_record.sap_number
                ),
                false,
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'User created in auth.users with ID: %', public_user_record.id;
        ELSE
            RAISE NOTICE 'User not found in public.users';
        END IF;
    ELSE
        RAISE NOTICE 'User already exists in auth.users';
    END IF;
END $$;

-- 3. Проверяем результат
SELECT 
    'Final Check' as status,
    au.id as auth_id,
    au.email as auth_email,
    au.email_confirmed_at,
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
