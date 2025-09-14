-- Создаем функцию для исправления синхронизации пользователей
CREATE OR REPLACE FUNCTION fix_user_sync()
RETURNS TABLE(
    step text,
    result text,
    details text
) 
LANGUAGE plpgsql
AS $$
DECLARE
    user_record RECORD;
    old_id uuid;
    new_id uuid;
    affected_rows integer;
BEGIN
    -- Шаг 1: Находим пользователя с проблемой
    SELECT au.id as auth_id, pu.id as public_id, au.email
    INTO user_record
    FROM auth.users au
    JOIN public.users pu ON au.email = pu.email
    WHERE au.email = 'doirp@sns.ru' AND au.id != pu.id
    LIMIT 1;
    
    IF user_record IS NULL THEN
        RETURN QUERY SELECT 'Step 1'::text, 'No mismatch found'::text, 'User sync is already correct'::text;
        RETURN;
    END IF;
    
    old_id := user_record.public_id;
    new_id := user_record.auth_id;
    
    RETURN QUERY SELECT 'Step 1'::text, 'Found mismatch'::text, 
        format('Old ID: %s, New ID: %s, Email: %s', old_id, new_id, user_record.email);
    
    -- Шаг 2: Временно отключаем проверку внешних ключей
    SET session_replication_role = replica;
    
    RETURN QUERY SELECT 'Step 2'::text, 'Disabled FK checks'::text, 'session_replication_role = replica'::text;
    
    -- Шаг 3: Обновляем все внешние ключи
    -- Events
    UPDATE events SET creator_id = new_id WHERE creator_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3a'::text, 'Updated events'::text, format('Affected rows: %s', affected_rows);
    
    -- Event participants
    UPDATE event_participants SET user_id = new_id WHERE user_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3b'::text, 'Updated event_participants'::text, format('Affected rows: %s', affected_rows);
    
    -- User test attempts
    UPDATE user_test_attempts SET user_id = new_id WHERE user_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3c'::text, 'Updated user_test_attempts (user_id)'::text, format('Affected rows: %s', affected_rows);
    
    UPDATE user_test_attempts SET reviewed_by = new_id WHERE reviewed_by = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3d'::text, 'Updated user_test_attempts (reviewed_by)'::text, format('Affected rows: %s', affected_rows);
    
    -- Test answer reviews
    UPDATE test_answer_reviews SET reviewer_id = new_id WHERE reviewer_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3e'::text, 'Updated test_answer_reviews'::text, format('Affected rows: %s', affected_rows);
    
    -- TP evaluations
    UPDATE tp_evaluations SET evaluator_id = new_id WHERE evaluator_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3f'::text, 'Updated tp_evaluations (evaluator_id)'::text, format('Affected rows: %s', affected_rows);
    
    UPDATE tp_evaluations SET participant_id = new_id WHERE participant_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3g'::text, 'Updated tp_evaluations (participant_id)'::text, format('Affected rows: %s', affected_rows);
    
    -- Trainer territories
    UPDATE trainer_territories SET trainer_id = new_id WHERE trainer_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3h'::text, 'Updated trainer_territories'::text, format('Affected rows: %s', affected_rows);
    
    -- Admin logs
    UPDATE admin_logs SET admin_id = new_id WHERE admin_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3i'::text, 'Updated admin_logs'::text, format('Affected rows: %s', affected_rows);
    
    -- Notification tasks
    UPDATE notification_tasks SET assigned_to = new_id WHERE assigned_to = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3j'::text, 'Updated notification_tasks (assigned_to)'::text, format('Affected rows: %s', affected_rows);
    
    UPDATE notification_tasks SET assigned_by = new_id WHERE assigned_by = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3k'::text, 'Updated notification_tasks (assigned_by)'::text, format('Affected rows: %s', affected_rows);
    
    -- Feedback submissions
    UPDATE feedback_submissions SET user_id = new_id WHERE user_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3l'::text, 'Updated feedback_submissions (user_id)'::text, format('Affected rows: %s', affected_rows);
    
    UPDATE feedback_submissions SET reviewed_by = new_id WHERE reviewed_by = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3m'::text, 'Updated feedback_submissions (reviewed_by)'::text, format('Affected rows: %s', affected_rows);
    
    -- User logs
    UPDATE user_logs SET user_id = new_id WHERE user_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3n'::text, 'Updated user_logs'::text, format('Affected rows: %s', affected_rows);
    
    -- User activity logs
    UPDATE user_activity_logs SET user_id = new_id WHERE user_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3o'::text, 'Updated user_activity_logs'::text, format('Affected rows: %s', affected_rows);
    
    -- User QR tokens
    UPDATE user_qr_tokens SET user_id = new_id WHERE user_id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 3p'::text, 'Updated user_qr_tokens'::text, format('Affected rows: %s', affected_rows);
    
    -- Шаг 4: Обновляем ID в таблице users
    UPDATE public.users SET id = new_id WHERE id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT 'Step 4'::text, 'Updated users table'::text, format('Affected rows: %s', affected_rows);
    
    -- Шаг 5: Включаем обратно проверку внешних ключей
    SET session_replication_role = DEFAULT;
    
    RETURN QUERY SELECT 'Step 5'::text, 'Enabled FK checks'::text, 'session_replication_role = DEFAULT'::text;
    
    -- Шаг 6: Проверяем результат
    SELECT au.id, pu.id, au.email
    INTO user_record
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE au.email = 'doirp@sns.ru';
    
    IF user_record.public_id IS NOT NULL THEN
        RETURN QUERY SELECT 'Step 6'::text, 'SUCCESS'::text, 
            format('User synced: Auth ID: %s, Public ID: %s', user_record.auth_id, user_record.public_id);
    ELSE
        RETURN QUERY SELECT 'Step 6'::text, 'ERROR'::text, 'User not found in public.users after sync'::text;
    END IF;
    
END;
$$;
