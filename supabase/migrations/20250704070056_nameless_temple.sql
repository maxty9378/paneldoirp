/*
  # Улучшение доступности тестов для участников

  1. Новые функции
    - Улучшенная функция для автоматического назначения тестов участникам
    - Доработанная логика определения целевых мероприятий
  
  2. Изменения в политиках безопасности
    - Обеспечение доступа к тестам для обычных пользователей
    - Улучшенное логирование назначения тестов
  
  3. Триггеры
    - Оптимизация триггера для назначения тестов участникам мероприятий
*/

-- Обновленная функция для автоматического назначения тестов участникам
CREATE OR REPLACE FUNCTION auto_assign_tests_to_participant()
RETURNS TRIGGER AS $$
DECLARE
    entry_test_id UUID;
    final_test_id UUID;
    event_type_id UUID;
    is_online_training BOOLEAN;
    is_sales_training BOOLEAN;
    event_title TEXT;
    user_full_name TEXT;
BEGIN
    -- Получаем информацию о мероприятии и его типе
    SELECT 
        e.event_type_id, 
        et.name = 'online_training',
        e.title,
        u.full_name INTO 
        event_type_id, 
        is_online_training, 
        event_title,
        user_full_name
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    LEFT JOIN users u ON u.id = NEW.user_id
    WHERE e.id = NEW.event_id;
    
    -- Проверяем, является ли это тренингом "Технология эффективных продаж"
    is_sales_training := event_title ILIKE '%Технология эффективных продаж%';
    
    -- Если не онлайн-тренинг или не тренинг по продажам, выходим
    IF NOT (is_online_training AND is_sales_training) THEN
        RETURN NEW;
    END IF;
    
    -- Находим входной и финальный тесты для этого типа мероприятия
    SELECT id INTO entry_test_id
    FROM tests
    WHERE event_type_id = event_type_id
    AND type = 'entry'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    SELECT id INTO final_test_id
    FROM tests
    WHERE event_type_id = event_type_id
    AND type = 'final'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Создаем тестовые попытки для пользователя, если он присутствовал
    IF NEW.attended THEN
        -- Входной тест
        IF entry_test_id IS NOT NULL THEN
            -- Проверяем, существует ли уже попытка
            IF NOT EXISTS (
                SELECT 1 FROM user_test_attempts
                WHERE user_id = NEW.user_id
                AND test_id = entry_test_id
                AND event_id = NEW.event_id
            ) THEN
                -- Создаем попытку для входного теста
                INSERT INTO user_test_attempts (
                    user_id, test_id, event_id, status, start_time
                ) VALUES (
                    NEW.user_id, entry_test_id, NEW.event_id, 'in_progress', CURRENT_TIMESTAMP
                );
                
                -- Логируем назначение
                INSERT INTO admin_logs (
                    action,
                    resource_type,
                    resource_id,
                    new_values,
                    success
                ) VALUES (
                    'auto_assign_entry_test',
                    'user_test_attempts',
                    NEW.user_id,
                    jsonb_build_object(
                        'user_id', NEW.user_id,
                        'user_name', user_full_name,
                        'test_id', entry_test_id,
                        'event_id', NEW.event_id,
                        'event_title', event_title
                    ),
                    TRUE
                );
            END IF;
        END IF;
        
        -- Финальный тест
        IF final_test_id IS NOT NULL THEN
            -- Проверяем, существует ли уже попытка
            IF NOT EXISTS (
                SELECT 1 FROM user_test_attempts
                WHERE user_id = NEW.user_id
                AND test_id = final_test_id
                AND event_id = NEW.event_id
            ) THEN
                -- Создаем попытку для финального теста
                INSERT INTO user_test_attempts (
                    user_id, test_id, event_id, status, start_time
                ) VALUES (
                    NEW.user_id, final_test_id, NEW.event_id, 'in_progress', CURRENT_TIMESTAMP
                );
                
                -- Логируем назначение
                INSERT INTO admin_logs (
                    action,
                    resource_type,
                    resource_id,
                    new_values,
                    success
                ) VALUES (
                    'auto_assign_final_test',
                    'user_test_attempts',
                    NEW.user_id,
                    jsonb_build_object(
                        'user_id', NEW.user_id,
                        'user_name', user_full_name,
                        'test_id', final_test_id,
                        'event_id', NEW.event_id,
                        'event_title', event_title
                    ),
                    TRUE
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Обновляем политику для user_test_attempts, чтобы пользователи могли видеть свои попытки
DROP POLICY IF EXISTS "Users can view their own test attempts" ON user_test_attempts;
CREATE POLICY "Users can view their own test attempts"
ON user_test_attempts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

-- Обновляем политику для тестов, чтобы пользователи могли видеть тесты, назначенные им
DROP POLICY IF EXISTS "Users can view their tests" ON tests;
CREATE POLICY "Users can view their tests"
ON tests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_test_attempts
    WHERE user_test_attempts.user_id = auth.uid()
    AND user_test_attempts.test_id = tests.id
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

-- Триггер для назначения тестов
DROP TRIGGER IF EXISTS trigger_auto_assign_tests ON event_participants;
CREATE TRIGGER trigger_auto_assign_tests
AFTER INSERT OR UPDATE OF attended ON event_participants
FOR EACH ROW
WHEN (NEW.attended = true)
EXECUTE FUNCTION auto_assign_tests_to_participant();

-- Обеспечить доступ к вопросам для всех участников
DROP POLICY IF EXISTS "Users can view test questions" ON test_questions;
CREATE POLICY "Users can view test questions"
ON test_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tests
    JOIN user_test_attempts ON tests.id = user_test_attempts.test_id
    WHERE tests.id = test_questions.test_id
    AND user_test_attempts.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

-- Обеспечить доступ к вариантам ответов для всех участников
DROP POLICY IF EXISTS "Users can view test answers" ON test_answers;
CREATE POLICY "Users can view test answers"
ON test_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM test_questions
    JOIN tests ON tests.id = test_questions.test_id
    JOIN user_test_attempts ON tests.id = user_test_attempts.test_id
    WHERE test_questions.id = test_answers.question_id
    AND user_test_attempts.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

-- Обеспечить доступ для создания ответов пользователями
DROP POLICY IF EXISTS "Users can create their own test answers" ON user_test_answers;
CREATE POLICY "Users can create their own test answers"
ON user_test_answers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_test_attempts
    WHERE user_test_attempts.id = user_test_answers.attempt_id
    AND user_test_attempts.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);