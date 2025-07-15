/*
  # Исправление неоднозначной ссылки на event_type_id

  1. Проблема
    - При обновлении таблицы event_participants возникает ошибка "column reference event_type_id is ambiguous"
    - Это происходит в триггере auto_assign_tests_to_participant

  2. Решение
    - Обновляем функцию auto_assign_tests_to_participant, добавляя явные алиасы таблиц
    - Исправляем все ссылки на event_type_id с указанием конкретной таблицы
*/

-- Удаляем существующую функцию и создаем исправленную версию
DROP FUNCTION IF EXISTS auto_assign_tests_to_participant();

CREATE OR REPLACE FUNCTION auto_assign_tests_to_participant()
RETURNS trigger AS $$
BEGIN
  -- Проверяем, что участник отмечен как присутствующий
  IF NEW.attended = true THEN
    -- Назначаем входные тесты
    INSERT INTO user_test_attempts (user_id, test_id, event_id, status)
    SELECT 
      NEW.user_id,
      t.id,
      NEW.event_id,
      'in_progress'
    FROM events e
    JOIN tests t ON t.event_type_id = e.event_type_id
    WHERE e.id = NEW.event_id 
      AND t.type = 'entry'
      AND t.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM user_test_attempts uta
        WHERE uta.user_id = NEW.user_id 
          AND uta.test_id = t.id 
          AND uta.event_id = NEW.event_id
      );

    -- Назначаем финальные тесты
    INSERT INTO user_test_attempts (user_id, test_id, event_id, status)
    SELECT 
      NEW.user_id,
      t.id,
      NEW.event_id,
      'in_progress'
    FROM events e
    JOIN tests t ON t.event_type_id = e.event_type_id
    WHERE e.id = NEW.event_id 
      AND t.type = 'final'
      AND t.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM user_test_attempts uta
        WHERE uta.user_id = NEW.user_id 
          AND uta.test_id = t.id 
          AND uta.event_id = NEW.event_id
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Также исправляем функцию assign_tests_for_online_training, если она существует
DROP FUNCTION IF EXISTS assign_tests_for_online_training();

CREATE OR REPLACE FUNCTION assign_tests_for_online_training()
RETURNS trigger AS $$
BEGIN
  -- Проверяем, что это онлайн-мероприятие
  IF EXISTS (
    SELECT 1 
    FROM event_types et
    JOIN events e ON e.event_type_id = et.id
    WHERE e.id = NEW.id AND et.is_online = true
  ) THEN
    -- Автоматически назначаем тесты всем участникам онлайн-мероприятий
    INSERT INTO user_test_attempts (user_id, test_id, event_id, status)
    SELECT 
      ep.user_id,
      t.id,
      NEW.id,
      'in_progress'
    FROM event_participants ep
    JOIN events e ON e.id = ep.event_id
    JOIN tests t ON t.event_type_id = e.event_type_id
    WHERE ep.event_id = NEW.id 
      AND t.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM user_test_attempts uta
        WHERE uta.user_id = ep.user_id 
          AND uta.test_id = t.id 
          AND uta.event_id = NEW.id
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;