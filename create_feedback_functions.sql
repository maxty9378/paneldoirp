-- Создание функций для работы с обратной связью
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Функция для получения шаблонов обратной связи для мероприятия
CREATE OR REPLACE FUNCTION get_feedback_templates_for_event(p_event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', ft.id,
            'name', ft.name,
            'description', ft.description,
            'questions', (
                SELECT json_agg(
                    json_build_object(
                        'id', fq.id,
                        'question_text', fq.question_text,
                        'question_type', fq.question_type,
                        'is_required', fq.is_required,
                        'options', fq.options,
                        'order_index', fq.order_index
                    ) ORDER BY fq.order_index
                )
                FROM feedback_questions fq
                WHERE fq.template_id = ft.id
            )
        )
    ) INTO result
    FROM feedback_templates ft
    WHERE ft.is_active = true
        AND (ft.event_type_id IS NULL OR ft.event_type_id = (
            SELECT event_type_id FROM events WHERE id = p_event_id
        ));
    
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RETURN '{"error": "' || SQLERRM || '"}'::json;
END;
$$;

-- 2. Функция для сохранения ответов обратной связи
CREATE OR REPLACE FUNCTION submit_feedback(
    p_event_id uuid,
    p_template_id uuid,
    p_rating decimal,
    p_comment text,
    p_answers jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_submission_id uuid;
    v_user_id uuid;
    answer_item jsonb;
    v_question_id uuid;
    v_answer_text text;
    v_answer_rating integer;
    v_answer_choice text;
BEGIN
    -- Получаем ID текущего пользователя
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;
    
    -- Создаем запись об отправке отзыва
    INSERT INTO feedback_submissions (
        user_id, event_id, template_id, rating, comment
    ) VALUES (
        v_user_id, p_event_id, p_template_id, p_rating, p_comment
    ) RETURNING id INTO v_submission_id;
    
    -- Сохраняем ответы на вопросы
    FOR answer_item IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        v_question_id := (answer_item->>'question_id')::uuid;
        v_answer_text := answer_item->>'answer_text';
        v_answer_rating := (answer_item->>'answer_rating')::integer;
        v_answer_choice := answer_item->>'answer_choice';
        
        INSERT INTO feedback_answers (
            submission_id, question_id, answer_text, answer_rating, answer_choice
        ) VALUES (
            v_submission_id, v_question_id, v_answer_text, v_answer_rating, v_answer_choice
        );
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'submission_id', v_submission_id,
        'message', 'Feedback submitted successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- 3. Функция для проверки, может ли пользователь оставить обратную связь
CREATE OR REPLACE FUNCTION can_user_submit_feedback(
    p_user_id uuid,
    p_event_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    has_completed_tests boolean := false;
    test_count integer := 0;
    completed_count integer := 0;
BEGIN
    -- Проверяем, есть ли тесты для этого мероприятия
    SELECT COUNT(*) INTO test_count
    FROM tests t
    WHERE t.event_id = p_event_id;
    
    IF test_count = 0 THEN
        RETURN true; -- Если тестов нет, можно оставлять обратную связь
    END IF;
    
    -- Проверяем, завершены ли все тесты пользователем
    SELECT COUNT(*) INTO completed_count
    FROM user_test_attempts uta
    JOIN tests t ON uta.test_id = t.id
    WHERE uta.user_id = p_user_id
        AND t.event_id = p_event_id
        AND uta.status = 'completed';
    
    RETURN completed_count = test_count;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- 4. Функция для получения статистики обратной связи по мероприятию
CREATE OR REPLACE FUNCTION get_event_feedback_stats(p_event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_submissions', COUNT(*),
        'average_rating', COALESCE(AVG(rating), 0),
        'rating_distribution', json_build_object(
            'excellent', COUNT(CASE WHEN rating >= 4.5 THEN 1 END),
            'good', COUNT(CASE WHEN rating >= 3.5 AND rating < 4.5 THEN 1 END),
            'average', COUNT(CASE WHEN rating >= 2.5 AND rating < 3.5 THEN 1 END),
            'poor', COUNT(CASE WHEN rating < 2.5 THEN 1 END)
        ),
        'recent_submissions', (
            SELECT json_agg(
                json_build_object(
                    'id', fs.id,
                    'user_name', u.full_name,
                    'rating', fs.rating,
                    'comment', fs.comment,
                    'submitted_at', fs.submitted_at
                ) ORDER BY fs.submitted_at DESC
            )
            FROM feedback_submissions fs
            JOIN users u ON fs.user_id = u.id
            WHERE fs.event_id = p_event_id
            LIMIT 10
        )
    ) INTO result
    FROM feedback_submissions
    WHERE event_id = p_event_id;
    
    RETURN COALESCE(result, '{}'::json);
EXCEPTION
    WHEN OTHERS THEN
        RETURN '{"error": "' || SQLERRM || '"}'::json;
END;
$$;

-- 5. Функция для получения ответов пользователя на обратную связь
CREATE OR REPLACE FUNCTION get_user_feedback_submissions(p_user_id uuid, p_event_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', fs.id,
            'event_id', fs.event_id,
            'template_id', fs.template_id,
            'rating', fs.rating,
            'comment', fs.comment,
            'status', fs.status,
            'submitted_at', fs.submitted_at,
            'answers', (
                SELECT json_agg(
                    json_build_object(
                        'question_id', fa.question_id,
                        'question_text', fq.question_text,
                        'answer_text', fa.answer_text,
                        'answer_rating', fa.answer_rating,
                        'answer_choice', fa.answer_choice
                    )
                )
                FROM feedback_answers fa
                JOIN feedback_questions fq ON fa.question_id = fq.id
                WHERE fa.submission_id = fs.id
            )
        )
    ) INTO result
    FROM feedback_submissions fs
    WHERE fs.user_id = p_user_id
        AND (p_event_id IS NULL OR fs.event_id = p_event_id)
    ORDER BY fs.submitted_at DESC;
    
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        RETURN '{"error": "' || SQLERRM || '"}'::json;
END;
$$;

-- 6. Предоставляем права доступа
GRANT EXECUTE ON FUNCTION get_feedback_templates_for_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_feedback(uuid, uuid, decimal, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_submit_feedback(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_feedback_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_feedback_submissions(uuid, uuid) TO authenticated;

-- 7. Добавляем комментарии
COMMENT ON FUNCTION get_feedback_templates_for_event IS 'Получает шаблоны обратной связи для мероприятия';
COMMENT ON FUNCTION submit_feedback IS 'Сохраняет ответы обратной связи пользователя';
COMMENT ON FUNCTION can_user_submit_feedback IS 'Проверяет, может ли пользователь оставить обратную связь';
COMMENT ON FUNCTION get_event_feedback_stats IS 'Получает статистику обратной связи по мероприятию';
COMMENT ON FUNCTION get_user_feedback_submissions IS 'Получает отправленные пользователем отзывы';

-- 8. Проверяем результат
SELECT 'Feedback Functions Created Successfully' as status;
