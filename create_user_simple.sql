-- Простое создание пользователя doirp@sns.ru с паролем 123456
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Создаем пользователя в auth.users
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
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'doirp@sns.ru',
    crypt('123456', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Кадочкин Максим", "role": "administrator", "sap_number": "7777777"}',
    false,
    NOW(),
    NOW()
);

-- 2. Получаем ID и создаем/обновляем в public.users
DO $$
DECLARE
    new_user_id uuid;
    existing_user_id uuid;
BEGIN
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'doirp@sns.ru';
    
    -- Проверяем, есть ли уже пользователь в public.users
    SELECT id INTO existing_user_id FROM public.users WHERE email = 'doirp@sns.ru';
    
    IF existing_user_id IS NOT NULL THEN
        -- Обновляем существующего пользователя
        UPDATE public.users SET
            id = new_user_id,
            full_name = 'Кадочкин Максим',
            role = 'administrator',
            subdivision = 'management_company',
            status = 'active',
            is_active = true,
            work_experience_days = 365,
            department = 'management_company',
            sap_number = '7777777',
            position_id = '4457b9e4-a3bb-466f-9bd9-3263b969a73f',
            territory_id = 'f0f81fcf-624f-40af-9c55-85ca33ba6b56',
            updated_at = NOW()
        WHERE email = 'doirp@sns.ru';
        
        RAISE NOTICE 'User updated with new ID: %', new_user_id;
    ELSE
        -- Создаем нового пользователя
        INSERT INTO public.users (
            id, email, full_name, role, subdivision, status, is_active, 
            work_experience_days, department, sap_number, position_id, territory_id,
            created_at, updated_at
        ) VALUES (
            new_user_id, 'doirp@sns.ru', 'Кадочкин Максим', 'administrator', 
            'management_company', 'active', true, 365, 'management_company', '7777777',
            '4457b9e4-a3bb-466f-9bd9-3263b969a73f', 'f0f81fcf-624f-40af-9c55-85ca33ba6b56',
            NOW(), NOW()
        );
        
        RAISE NOTICE 'User created with ID: %', new_user_id;
    END IF;
END $$;

-- 3. Проверяем результат
SELECT 
    'Result' as status,
    au.id as auth_id,
    au.email as auth_email,
    pu.id as public_id,
    pu.email as public_email,
    CASE WHEN au.id = pu.id THEN '✅ SYNCED' ELSE '❌ NOT SYNCED' END as sync_status
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'doirp@sns.ru';
