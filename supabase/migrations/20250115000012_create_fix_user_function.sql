-- Создаем RPC функцию для исправления синхронизации пользователя
CREATE OR REPLACE FUNCTION rpc_fix_user_sync(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_id uuid;
    public_user_id uuid;
    result json;
    step_result text;
BEGIN
    -- Получаем ID из auth.users
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = p_email;
    
    -- Получаем ID из public.users
    SELECT id INTO public_user_id 
    FROM public.users 
    WHERE email = p_email;
    
    -- Если пользователь не найден
    IF auth_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found in auth.users',
            'auth_id', null,
            'public_id', public_user_id
        );
    END IF;
    
    -- Если пользователь не найден в public.users
    IF public_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found in public.users',
            'auth_id', auth_user_id,
            'public_id', null
        );
    END IF;
    
    -- Если ID совпадают, все в порядке
    IF auth_user_id = public_user_id THEN
        RETURN json_build_object(
            'success', true,
            'message', 'User already synced',
            'auth_id', auth_user_id,
            'public_id', public_user_id
        );
    END IF;
    
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
    
    RETURN json_build_object(
        'success', true,
        'message', 'User sync completed successfully',
        'auth_id', auth_user_id,
        'public_id', public_user_id,
        'old_public_id', public_user_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Включаем обратно проверку внешних ключей в случае ошибки
        SET session_replication_role = DEFAULT;
        
        RETURN json_build_object(
            'success', false,
            'message', 'Error during sync: ' || SQLERRM,
            'auth_id', auth_user_id,
            'public_id', public_user_id
        );
END;
$$;
