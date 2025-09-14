-- Безопасная синхронизация пользователей с обновлением внешних ключей
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущее состояние
SELECT 
    'Current State Check' as check_type,
    'Auth Users' as source,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Current State Check' as check_type,
    'Public Users' as source,
    COUNT(*) as count
FROM public.users;

-- 2. Находим несоответствия
SELECT 
    'Mismatch Check' as check_type,
    au.id as auth_id,
    au.email as auth_email,
    pu.id as public_id,
    pu.email as public_email,
    CASE 
        WHEN pu.id IS NULL THEN '❌ MISSING IN PUBLIC'
        WHEN au.id != pu.id THEN '❌ ID MISMATCH'
        WHEN au.email != pu.email THEN '❌ EMAIL MISMATCH'
        ELSE '✅ SYNCED'
    END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
ORDER BY au.email;

-- 3. Создаем временную таблицу для маппинга старых ID на новые
CREATE TEMP TABLE user_id_mapping AS
SELECT 
    pu.id as old_id,
    au.id as new_id,
    pu.email
FROM public.users pu
JOIN auth.users au ON pu.email = au.email
WHERE pu.id != au.id;

-- 4. Показываем маппинг
SELECT 
    'ID Mapping' as check_type,
    old_id,
    new_id,
    email
FROM user_id_mapping;

-- 5. Обновляем внешние ключи в таблице events
UPDATE events 
SET creator_id = um.new_id
FROM user_id_mapping um
WHERE events.creator_id = um.old_id;

-- 6. Обновляем внешние ключи в других таблицах
UPDATE event_participants 
SET user_id = um.new_id
FROM user_id_mapping um
WHERE event_participants.user_id = um.old_id;

UPDATE user_test_attempts 
SET user_id = um.new_id
FROM user_id_mapping um
WHERE user_test_attempts.user_id = um.old_id;

UPDATE user_test_attempts 
SET reviewed_by = um.new_id
FROM user_id_mapping um
WHERE user_test_attempts.reviewed_by = um.old_id;

UPDATE user_test_answers 
SET user_id = um.new_id
FROM user_id_mapping um
WHERE user_test_answers.user_id = um.old_id;

UPDATE test_answer_reviews 
SET reviewer_id = um.new_id
FROM user_id_mapping um
WHERE test_answer_reviews.reviewer_id = um.old_id;

UPDATE tp_evaluations 
SET evaluator_id = um.new_id
FROM user_id_mapping um
WHERE tp_evaluations.evaluator_id = um.old_id;

UPDATE tp_evaluations 
SET participant_id = um.new_id
FROM user_id_mapping um
WHERE tp_evaluations.participant_id = um.old_id;

UPDATE trainer_territories 
SET trainer_id = um.new_id
FROM user_id_mapping um
WHERE trainer_territories.trainer_id = um.old_id;

UPDATE admin_logs 
SET admin_id = um.new_id
FROM user_id_mapping um
WHERE admin_logs.admin_id = um.old_id;

UPDATE notification_tasks 
SET assigned_to = um.new_id
FROM user_id_mapping um
WHERE notification_tasks.assigned_to = um.old_id;

UPDATE notification_tasks 
SET assigned_by = um.new_id
FROM user_id_mapping um
WHERE notification_tasks.assigned_by = um.old_id;

UPDATE feedback_submissions 
SET user_id = um.new_id
FROM user_id_mapping um
WHERE feedback_submissions.user_id = um.old_id;

UPDATE feedback_submissions 
SET reviewed_by = um.new_id
FROM user_id_mapping um
WHERE feedback_submissions.reviewed_by = um.old_id;

UPDATE user_logs 
SET user_id = um.new_id
FROM user_id_mapping um
WHERE user_logs.user_id = um.old_id;

UPDATE user_activity_logs 
SET user_id = um.new_id
FROM user_id_mapping um
WHERE user_activity_logs.user_id = um.old_id;

UPDATE user_qr_tokens 
SET user_id = um.new_id
FROM user_id_mapping um
WHERE user_qr_tokens.user_id = um.old_id;

-- 7. Теперь безопасно обновляем ID в таблице users
UPDATE public.users 
SET id = um.new_id
FROM user_id_mapping um
WHERE public.users.id = um.old_id;

-- 8. Создаем недостающих пользователей из auth.users
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
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    COALESCE((au.raw_user_meta_data->>'role')::user_role_enum, 'employee'::user_role_enum),
    'management_company'::subdivision_enum,
    'active'::user_status_enum,
    true,
    0,
    'management_company',
    NOW(),
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 9. Удаляем дубликаты по email (оставляем только с правильным ID)
DELETE FROM public.users 
WHERE id NOT IN (
    SELECT au.id 
    FROM auth.users au 
    WHERE au.email = public.users.email
);

-- 10. Очищаем временную таблицу
DROP TABLE user_id_mapping;

-- 11. Проверяем результат
SELECT 
    'Sync Complete' as status,
    'Auth Users' as source,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Sync Complete' as status,
    'Public Users' as source,
    COUNT(*) as count
FROM public.users;

-- 12. Проверяем конкретного пользователя
SELECT 
    'User Check' as check_type,
    au.id as auth_id,
    au.email as auth_email,
    pu.id as public_id,
    pu.email as public_email,
    pu.full_name,
    pu.role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'doirp@sns.ru';
