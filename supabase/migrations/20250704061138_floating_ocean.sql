/*
  # Автоматическое назначение тестов для курсов

  1. Новые возможности
     - Автоматическое назначение тестов при создании мероприятия "Технология эффективных продаж"
     - Сохранение результатов тестирования с временем прохождения каждого вопроса
  
  2. Функциональные изменения
     - Добавлен триггер для назначения тестов при создании мероприятия
     - Добавлены функции для отслеживания прогресса тестирования
*/

-- Функция для назначения тестов при создании мероприятия типа "online_training"
CREATE OR REPLACE FUNCTION assign_tests_for_online_training()
RETURNS TRIGGER AS $$
DECLARE
    entry_test_id UUID;
    final_test_id UUID;
    training_type_id UUID;
    is_sales_training BOOLEAN;
BEGIN
    -- Проверяем, является ли это мероприятие онлайн-тренингом
    SELECT id INTO training_type_id
    FROM event_types
    WHERE name = 'online_training'
    LIMIT 1;

    -- Проверяем, это "Технология эффективных продаж"
    is_sales_training := NEW.title ILIKE '%Технология эффективных продаж%';
    
    -- Если это не онлайн-тренинг или не курс продаж, выходим
    IF NEW.event_type_id != training_type_id OR NOT is_sales_training THEN
        RETURN NEW;
    END IF;

    -- Находим ID входного и финального тестов
    SELECT id INTO entry_test_id
    FROM tests
    WHERE event_type_id = training_type_id
      AND type = 'entry'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    SELECT id INTO final_test_id
    FROM tests
    WHERE event_type_id = training_type_id
      AND type = 'final'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Логируем назначение тестов
    INSERT INTO admin_logs (
        action,
        resource_type,
        resource_id,
        new_values,
        success
    ) VALUES (
        'auto_assign_tests',
        'events',
        NEW.id,
        jsonb_build_object(
            'event_id', NEW.id,
            'event_title', NEW.title,
            'entry_test_id', entry_test_id,
            'final_test_id', final_test_id
        ),
        TRUE
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического назначения тестов
CREATE OR REPLACE TRIGGER trigger_assign_tests_for_online_training
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION assign_tests_for_online_training();

-- Функция для получения статистики прохождения теста
CREATE OR REPLACE FUNCTION get_test_stats(p_test_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH attempt_stats AS (
        SELECT 
            COUNT(*) as total_attempts,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_attempts,
            AVG(score) FILTER (WHERE score IS NOT NULL) as average_score,
            COUNT(*) FILTER (WHERE status = 'completed' AND score >= (
                SELECT passing_score FROM tests WHERE id = p_test_id
            )) as passed_attempts
        FROM user_test_attempts
        WHERE test_id = p_test_id
    ),
    question_time_stats AS (
        SELECT 
            question_id,
            AVG(answer_time_seconds) as avg_time,
            COUNT(*) as answer_count
        FROM user_test_answers
        WHERE answer_time_seconds IS NOT NULL
        AND attempt_id IN (SELECT id FROM user_test_attempts WHERE test_id = p_test_id)
        GROUP BY question_id
    ),
    total_time_stats AS (
        SELECT 
            SUM(avg_time * answer_count) as total_time_weighted,
            SUM(answer_count) as total_answers
        FROM question_time_stats
    ),
    slowest_question AS (
        SELECT 
            question_id,
            avg_time
        FROM question_time_stats
        ORDER BY avg_time DESC
        LIMIT 1
    )
    SELECT jsonb_build_object(
        'total_attempts', COALESCE(ast.total_attempts, 0),
        'completed_attempts', COALESCE(ast.completed_attempts, 0),
        'average_score', COALESCE(ast.average_score, 0),
        'pass_rate', CASE 
            WHEN COALESCE(ast.total_attempts, 0) > 0 
            THEN (COALESCE(ast.passed_attempts, 0) * 100.0 / COALESCE(ast.total_attempts, 1))
            ELSE 0 
        END,
        'average_time_per_question', CASE 
            WHEN COALESCE(tts.total_answers, 0) > 0 
            THEN COALESCE(tts.total_time_weighted / tts.total_answers, 0)
            ELSE 0 
        END,
        'slowest_question_id', sq.question_id,
        'slowest_question_time', COALESCE(sq.avg_time, 0)
    ) INTO result
    FROM (SELECT 1) t
    LEFT JOIN attempt_stats ast ON TRUE
    LEFT JOIN total_time_stats tts ON TRUE
    LEFT JOIN slowest_question sq ON TRUE;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Создаем функцию для получения всех вопросов теста с ответами и статистикой
CREATE OR REPLACE FUNCTION get_test_questions_with_stats(p_test_id UUID)
RETURNS TABLE (
    id UUID,
    question TEXT,
    question_type TEXT,
    points INTEGER,
    order_num INTEGER,
    answers JSONB,
    stats JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH answer_stats AS (
        SELECT 
            uta.question_id,
            jsonb_agg(
                jsonb_build_object(
                    'answer_id', uta.answer_id,
                    'is_correct', uta.is_correct,
                    'answer_time', uta.answer_time_seconds,
                    'count', 1
                )
            ) as answer_stats
        FROM user_test_answers uta
        JOIN user_test_attempts att ON uta.attempt_id = att.id
        WHERE att.test_id = p_test_id
        GROUP BY uta.question_id
    )
    SELECT 
        tq.id,
        tq.question,
        tq.question_type,
        tq.points,
        tq.order as order_num,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ta.id,
                    'text', ta.text,
                    'is_correct', ta.is_correct
                )
            )
            FROM test_answers ta
            WHERE ta.question_id = tq.id
        ) as answers,
        COALESCE(ast.answer_stats, '[]'::jsonb) as stats
    FROM test_questions tq
    LEFT JOIN answer_stats ast ON tq.id = ast.question_id
    WHERE tq.test_id = p_test_id
    ORDER BY tq.order;
END;
$$ LANGUAGE plpgsql;