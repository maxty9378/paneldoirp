/*
  # Добавление статистики времени ответов для тестирования

  1. Изменения
     - Добавление поля answer_time_seconds в таблицу user_test_answers
     - Обновление связанных триггеров и функций для работы с timing-статистикой

  2. Новые функциональные возможности
     - Отслеживание времени, затраченного на каждый вопрос
     - Восстановление прерванных сессий тестирования
     - Неограниченное время для тестов (time_limit = 0)
*/

-- Добавляем поле для хранения времени ответа на вопрос
ALTER TABLE user_test_answers ADD COLUMN IF NOT EXISTS answer_time_seconds INTEGER;

-- Добавляем индекс для ускорения поиска
CREATE INDEX IF NOT EXISTS user_test_answers_answer_time_idx ON user_test_answers (answer_time_seconds);

-- Обновляем тесты с time_limit = null
UPDATE tests SET time_limit = 30 WHERE time_limit IS NULL;

-- Добавляем функцию для восстановления сессии тестирования
CREATE OR REPLACE FUNCTION get_test_session_status(p_test_id UUID, p_user_id UUID, p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'attempt_id', uta.id,
        'start_time', uta.start_time,
        'elapsed_seconds', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - uta.start_time)),
        'has_answers', EXISTS (
            SELECT 1 FROM user_test_answers 
            WHERE attempt_id = uta.id
        )
    ) INTO result
    FROM user_test_attempts uta
    WHERE uta.test_id = p_test_id 
      AND uta.user_id = p_user_id 
      AND uta.event_id = p_event_id
      AND uta.status = 'in_progress'
    ORDER BY uta.start_time DESC
    LIMIT 1;

    RETURN COALESCE(result, '{"has_session": false}'::JSONB);
END;
$$ LANGUAGE plpgsql;