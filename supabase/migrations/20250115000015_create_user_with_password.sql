-- Создаем пользователя с паролем в auth.users
-- Используем правильный подход: сначала auth.users, потом public.users

-- Создаем пользователя в auth.users с паролем 123456
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
    gen_random_uuid(), -- Генерируем новый UUID
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'doirp@sns.ru',
    crypt('123456', gen_salt('bf')), -- Пароль 123456
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
        'full_name', 'Кадочкин Максим',
        'role', 'administrator',
        'sap_number', '7777777'
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

-- Получаем ID созданного пользователя
DO $$
DECLARE
    new_user_id uuid;
BEGIN
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'doirp@sns.ru';
    
    -- Создаем пользователя в public.users с тем же ID
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
        sap_number,
        position_id,
        territory_id,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        'doirp@sns.ru',
        'Кадочкин Максим',
        'administrator',
        'management_company',
        'active',
        true,
        365,
        'management_company',
        '7777777',
        '4457b9e4-a3bb-466f-9bd9-3263b969a73f',
        'f0f81fcf-624f-40af-9c55-85ca33ba6b56',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'User created with ID: %', new_user_id;
END $$;

-- Проверяем результат
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
