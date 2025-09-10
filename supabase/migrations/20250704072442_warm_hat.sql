/*
  # Улучшение автоматического назначения тестов
  
  1. Новые функции
    - Улучшенная функция для автоматического назначения тестов при отметке посещения
    - Добавление оповещений о назначенных тестах
    
  2. Индексы
    - Добавлены индексы для ускорения запросов к тестам
    
  3. Исправления RLS
    - Улучшенные политики для просмотра тестов участниками мероприятий
*/

-- Улучшенная функция для автоматического назначения тестов
CREATE OR REPLACE FUNCTION auto_assign_tests_to_participant()
RETURNS TRIGGER AS $$
DECLARE
    entry_test_id UUID;
    final_test_id UUID;
    annual_test_id UUID;
    event_type_id UUID;
    is_online_training BOOLEAN;
    event_title TEXT;
    user_full_name TEXT;
    new_attempt_id UUID;
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
    
    -- Проверяем, это онлайн-тренинг и это тренинг "Технология эффективных продаж"
    IF NOT (is_online_training AND event_title ILIKE '%Технология эффективных продаж%') THEN
        RETURN NEW;
    END IF;
    
    -- Находим входной тест
    SELECT id INTO entry_test_id
    FROM tests
    WHERE event_type_id = event_type_id
    AND type = 'entry'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Находим финальный тест
    SELECT id INTO final_test_id
    FROM tests
    WHERE event_type_id = event_type_id
    AND type = 'final'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Находим годовой тест
    SELECT id INTO annual_test_id
    FROM tests
    WHERE event_type_id = event_type_id
    AND type = 'annual'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Создаем тестовые попытки для пользователя
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
                -- Создаем попытку для входного теста и сохраняем ID
                INSERT INTO user_test_attempts (
                    user_id, test_id, event_id, status, start_time
                ) VALUES (
                    NEW.user_id, entry_test_id, NEW.event_id, 'in_progress', CURRENT_TIMESTAMP
                )
                RETURNING id INTO new_attempt_id;
                
                -- Создаем уведомление для пользователя
                INSERT INTO notification_tasks (
                    user_id,
                    title,
                    description,
                    type,
                    priority,
                    status,
                    metadata
                ) VALUES (
                    NEW.user_id,
                    'Назначен входной тест',
                    'Вам необходимо пройти входной тест для мероприятия "' || event_title || '"',
                    'test_assigned',
                    'high',
                    'pending',
                    jsonb_build_object(
                        'test_id', entry_test_id,
                        'event_id', NEW.event_id,
                        'attempt_id', new_attempt_id,
                        'test_type', 'entry',
                        'event_title', event_title
                    )
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
                        'event_title', event_title,
                        'attempt_id', new_attempt_id
                    ),
                    TRUE
                );
            END IF;
        END IF;
        
        -- Итоговый тест
        IF final_test_id IS NOT NULL THEN
            -- Проверяем, существует ли уже попытка
            IF NOT EXISTS (
                SELECT 1 FROM user_test_attempts
                WHERE user_id = NEW.user_id
                AND test_id = final_test_id
                AND event_id = NEW.event_id
            ) THEN
                -- Создаем попытку для финального теста и сохраняем ID
                INSERT INTO user_test_attempts (
                    user_id, test_id, event_id, status, start_time
                ) VALUES (
                    NEW.user_id, final_test_id, NEW.event_id, 'in_progress', CURRENT_TIMESTAMP
                )
                RETURNING id INTO new_attempt_id;
                
                -- Создаем уведомление для пользователя
                INSERT INTO notification_tasks (
                    user_id,
                    title,
                    description,
                    type,
                    priority,
                    status,
                    metadata
                ) VALUES (
                    NEW.user_id,
                    'Назначен финальный тест',
                    'Вам необходимо пройти финальный тест для мероприятия "' || event_title || '"',
                    'test_assigned',
                    'high',
                    'pending',
                    jsonb_build_object(
                        'test_id', final_test_id,
                        'event_id', NEW.event_id,
                        'attempt_id', new_attempt_id,
                        'test_type', 'final',
                        'event_title', event_title
                    )
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
                        'event_title', event_title,
                        'attempt_id', new_attempt_id
                    ),
                    TRUE
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Обеспечить доступ к тестам, связанным с типом мероприятия
DROP POLICY IF EXISTS "Users can view their relevant tests" ON tests;
CREATE POLICY "Users can view their relevant tests" 
ON tests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN event_participants ep ON e.id = ep.event_id
    WHERE e.event_type_id = tests.event_type_id
    AND ep.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

-- Создаем дополнительные индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS tests_type_status_idx ON tests (type, status);
CREATE INDEX IF NOT EXISTS tests_type_event_type_id_idx ON tests (type, event_type_id);
CREATE INDEX IF NOT EXISTS event_participants_user_id_attended_idx ON event_participants (user_id, attended);
CREATE INDEX IF NOT EXISTS user_test_attempts_user_event_test_idx ON user_test_attempts (user_id, event_id, test_id);