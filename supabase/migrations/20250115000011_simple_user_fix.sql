-- Простое исправление синхронизации пользователя doirp@sns.ru
-- Сначала проверим текущее состояние

-- 1. Проверяем ID в auth.users
SELECT 
    'Auth User' as source,
    id,
    email,
    created_at
FROM auth.users 
WHERE email = 'doirp@sns.ru';

-- 2. Проверяем ID в public.users
SELECT 
    'Public User' as source,
    id,
    email,
    full_name,
    created_at
FROM public.users 
WHERE email = 'doirp@sns.ru';

-- 3. Находим правильный ID из auth.users
DO $$
DECLARE
    auth_user_id uuid;
    public_user_id uuid;
BEGIN
    -- Получаем ID из auth.users
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = 'doirp@sns.ru';
    
    -- Получаем ID из public.users
    SELECT id INTO public_user_id 
    FROM public.users 
    WHERE email = 'doirp@sns.ru';
    
    -- Если ID не совпадают, исправляем
    IF auth_user_id IS NOT NULL AND public_user_id IS NOT NULL AND auth_user_id != public_user_id THEN
        RAISE NOTICE 'Found mismatch: Auth ID = %, Public ID = %', auth_user_id, public_user_id;
        
        -- Временно отключаем проверку внешних ключей
        SET session_replication_role = replica;
        
        -- Обновляем все внешние ключи
        UPDATE events SET creator_id = auth_user_id WHERE creator_id = public_user_id;
        UPDATE event_participants SET user_id = auth_user_id WHERE user_id = public_user_id;
        UPDATE user_test_attempts SET user_id = auth_user_id WHERE user_id = public_user_id;
        UPDATE user_test_attempts SET reviewed_by = auth_user_id WHERE reviewed_by = public_user_id;
        UPDATE test_answer_reviews SET reviewer_id = auth_user_id WHERE reviewer_id = public_user_id;
        UPDATE tp_evaluations SET evaluator_id = auth_user_id WHERE evaluator_id = public_user_id;
        UPDATE tp_evaluations SET participant_id = auth_user_id WHERE participant_id = public_user_id;
        UPDATE trainer_territories SET trainer_id = auth_user_id WHERE trainer_id = public_user_id;
        UPDATE admin_logs SET admin_id = auth_user_id WHERE admin_id = public_user_id;
        UPDATE notification_tasks SET assigned_to = auth_user_id WHERE assigned_to = public_user_id;
        UPDATE notification_tasks SET assigned_by = auth_user_id WHERE assigned_by = public_user_id;
        UPDATE feedback_submissions SET user_id = auth_user_id WHERE user_id = public_user_id;
        UPDATE feedback_submissions SET reviewed_by = auth_user_id WHERE reviewed_by = public_user_id;
        UPDATE user_logs SET user_id = auth_user_id WHERE user_id = public_user_id;
        UPDATE user_activity_logs SET user_id = auth_user_id WHERE user_id = public_user_id;
        UPDATE user_qr_tokens SET user_id = auth_user_id WHERE user_id = public_user_id;
        
        -- Обновляем ID в таблице users
        UPDATE public.users SET id = auth_user_id WHERE id = public_user_id;
        
        -- Включаем обратно проверку внешних ключей
        SET session_replication_role = DEFAULT;
        
        RAISE NOTICE 'User sync completed successfully';
    ELSE
        RAISE NOTICE 'No mismatch found or user not found';
    END IF;
END $$;

-- 4. Проверяем результат
SELECT 
    'Final Check' as status,
    au.id as auth_id,
    pu.id as public_id,
    au.email as auth_email,
    pu.email as public_email,
    CASE 
        WHEN au.id = pu.id THEN '✅ SYNCED'
        ELSE '❌ NOT SYNCED'
    END as sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email
WHERE au.email = 'doirp@sns.ru';
