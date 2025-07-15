/*
  # Исправление неоднозначной ссылки на колонку event_type_id
  
  1. Изменения
     - Сначала удаляем триггер, зависящий от функции
     - Затем удаляем и пересоздаем функции с явными ссылками на таблицы
     - Восстанавливаем триггер с использованием обновленной функции
  
  2. Причина изменений
     - Неоднозначная ссылка на колонку event_type_id вызывала ошибку при выполнении
     - В запросах с несколькими таблицами нужно явно указывать, из какой таблицы берется колонка
*/

-- Сначала удаляем триггер, который зависит от функции
DROP TRIGGER IF EXISTS trigger_auto_assign_tests ON event_participants;

-- Теперь можно удалить и пересоздать функцию
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

-- Восстанавливаем триггер с обновленной функцией
CREATE TRIGGER trigger_auto_assign_tests
  AFTER INSERT OR UPDATE OF attended ON event_participants
  FOR EACH ROW
  WHEN (NEW.attended = true)
  EXECUTE FUNCTION auto_assign_tests_to_participant();

-- Также исправляем функцию assign_tests_for_online_training
DROP TRIGGER IF EXISTS trigger_assign_tests_for_online_training ON events;

DROP FUNCTION IF EXISTS assign_tests_for_online_training();

CREATE OR REPLACE FUNCTION assign_tests_for_online_training()
RETURNS trigger AS $$
BEGIN
  -- Проверяем, что это онлайн-мероприятие
  IF EXISTS (
    SELECT 1 
    FROM event_types et
    WHERE et.id = NEW.event_type_id AND et.is_online = true
  ) THEN
    -- Автоматически назначаем тесты всем участникам онлайн-мероприятий
    INSERT INTO user_test_attempts (user_id, test_id, event_id, status)
    SELECT 
      ep.user_id,
      t.id,
      NEW.id,
      'in_progress'
    FROM event_participants ep
    JOIN tests t ON t.event_type_id = NEW.event_type_id
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

-- Восстанавливаем триггер для assign_tests_for_online_training
CREATE TRIGGER trigger_assign_tests_for_online_training
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION assign_tests_for_online_training();