-- Создаем пользователя в auth.users
-- Используем функцию для создания пользователя в системе аутентификации

-- Сначала проверим, есть ли пользователь в auth.users
DO $$
DECLARE
    auth_user_exists boolean;
    public_user_record record;
    new_auth_user_id uuid;
BEGIN
    -- Проверяем, есть ли пользователь в auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'doirp@sns.ru') INTO auth_user_exists;
    
    IF NOT auth_user_exists THEN
        -- Получаем данные из public.users
        SELECT * INTO public_user_record FROM public.users WHERE email = 'doirp@sns.ru';
        
        IF public_user_record IS NOT NULL THEN
            -- Создаем пользователя в auth.users
            INSERT INTO auth.users (
                id,
                instance_id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                invited_at,
                confirmation_token,
                confirmation_sent_at,
                recovery_token,
                recovery_sent_at,
                email_change_token_new,
                email_change,
                email_change_sent_at,
                last_sign_in_at,
                raw_app_meta_data,
                raw_user_meta_data,
                is_super_admin,
                created_at,
                updated_at,
                phone,
                phone_confirmed_at,
                phone_change,
                phone_change_token,
                phone_change_sent_at,
                confirmed_at,
                email_change_token_current,
                email_change_confirm_status,
                banned_until,
                reauthentication_token,
                reauthentication_sent_at,
                is_sso_user,
                deleted_at
            ) VALUES (
                public_user_record.id, -- Используем тот же ID
                '00000000-0000-0000-0000-000000000000',
                'authenticated',
                'authenticated',
                public_user_record.email,
                crypt('password123', gen_salt('bf')), -- Временный пароль
                NOW(),
                NULL,
                '',
                NULL,
                '',
                NULL,
                '',
                '',
                NULL,
                NULL,
                '{"provider": "email", "providers": ["email"]}',
                json_build_object(
                    'full_name', public_user_record.full_name,
                    'role', public_user_record.role,
                    'sap_number', public_user_record.sap_number
                ),
                false,
                NOW(),
                NOW(),
                NULL,
                NULL,
                '',
                '',
                NULL,
                NOW(),
                '',
                0,
                NULL,
                '',
                NULL,
                false,
                NULL
            );
            
            RAISE NOTICE 'User created in auth.users with ID: %', public_user_record.id;
        ELSE
            RAISE NOTICE 'User not found in public.users';
        END IF;
    ELSE
        RAISE NOTICE 'User already exists in auth.users';
    END IF;
END $$;

-- Проверяем результат
SELECT 
    'Final Check' as status,
    au.id as auth_id,
    au.email as auth_email,
    au.email_confirmed_at,
    pu.id as public_id,
    pu.email as public_email,
    CASE 
        WHEN au.id = pu.id THEN '✅ SYNCED'
        ELSE '❌ NOT SYNCED'
    END as sync_status
FROM auth.users au
FULL OUTER JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'doirp@sns.ru' OR pu.email = 'doirp@sns.ru';
