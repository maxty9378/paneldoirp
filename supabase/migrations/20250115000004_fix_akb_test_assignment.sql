-- Исправляем логику назначения тестов АКБ - убираем требование attended = true
-- Обновляем функцию назначения тестов для участников АКБ

CREATE OR REPLACE FUNCTION assign_akb_tests_to_participants()
RETURNS trigger AS $$
DECLARE
    entry_test_id UUID;
    final_test_id UUID;
    annual_test_id UUID;
    new_attempt_id UUID;
    user_full_name TEXT;
    event_title TEXT;
BEGIN
    -- Получаем имя пользователя и название мероприятия для логирования
    SELECT u.full_name, e.title INTO user_full_name, event_title
    FROM users u, events e
    WHERE u.id = NEW.user_id AND e.id = NEW.event_id;
    
    -- Находим тесты АКБ по типу мероприятия и названию
    SELECT id INTO entry_test_id
    FROM tests
    WHERE event_type_id = (
        SELECT event_type_id FROM events WHERE id = NEW.event_id
    )
    AND type = 'entry'
    AND title ILIKE '%Управление территорией для развития АКБ%'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    SELECT id INTO final_test_id
    FROM tests
    WHERE event_type_id = (
        SELECT event_type_id FROM events WHERE id = NEW.event_id
    )
    AND type = 'final'
    AND title ILIKE '%Управление территорией для развития АКБ%'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    SELECT id INTO annual_test_id
    FROM tests
    WHERE event_type_id = (
        SELECT event_type_id FROM events WHERE id = NEW.event_id
    )
    AND type = 'annual'
    AND title ILIKE '%Управление территорией для развития АКБ%'
    AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Назначаем тесты всем участникам (убираем проверку attended)
    -- Входной тест
    IF entry_test_id IS NOT NULL THEN
        INSERT INTO user_test_attempts (user_id, test_id, event_id, status)
        VALUES (NEW.user_id, entry_test_id, NEW.event_id, 'in_progress')
        ON CONFLICT (user_id, test_id, event_id) DO NOTHING
        RETURNING id INTO new_attempt_id;
        
        RAISE NOTICE 'Назначен входной тест АКБ пользователю % для мероприятия %', user_full_name, event_title;
    END IF;
    
    -- Итоговый тест (назначается сразу, но со статусом pending)
    IF final_test_id IS NOT NULL THEN
        INSERT INTO user_test_attempts (user_id, test_id, event_id, status)
        VALUES (NEW.user_id, final_test_id, NEW.event_id, 'pending')
        ON CONFLICT (user_id, test_id, event_id) DO NOTHING
        RETURNING id INTO new_attempt_id;
        
        RAISE NOTICE 'Назначен итоговый тест АКБ пользователю % для мероприятия %', user_full_name, event_title;
    END IF;
    
    -- Годовой тест (назначается сразу, но со статусом pending)
    IF annual_test_id IS NOT NULL THEN
        INSERT INTO user_test_attempts (user_id, test_id, event_id, status)
        VALUES (NEW.user_id, annual_test_id, NEW.event_id, 'pending')
        ON CONFLICT (user_id, test_id, event_id) DO NOTHING
        RETURNING id INTO new_attempt_id;
        
        RAISE NOTICE 'Назначен годовой тест АКБ пользователю % для мероприятия %', user_full_name, event_title;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Обновляем триггер - убираем условие attended = true
DROP TRIGGER IF EXISTS trigger_assign_akb_tests_to_participants ON event_participants;

CREATE TRIGGER trigger_assign_akb_tests_to_participants
    AFTER INSERT ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION assign_akb_tests_to_participants();

-- Также обновляем общую функцию назначения тестов для всех типов мероприятий
CREATE OR REPLACE FUNCTION auto_assign_tests_to_participant()
RETURNS trigger AS $$
DECLARE
  v_event_id UUID;
  v_user_id UUID;
  v_event_type_id UUID;
  v_entry_test_id UUID;
  v_final_test_id UUID;
  v_annual_test_id UUID;
  v_start_date TIMESTAMP;
  is_akb_event BOOLEAN;
BEGIN
  -- Получаем базовые данные
  v_event_id := NEW.event_id;
  v_user_id := NEW.user_id;
  
  -- Получаем данные о мероприятии
  SELECT e.event_type_id, e.start_date, 
         (e.title ILIKE '%Управление территорией для развития АКБ%') INTO 
         v_event_type_id, v_start_date, is_akb_event
  FROM events e WHERE e.id = v_event_id;
  
  -- Для АКБ мероприятий назначаем тесты всем участникам
  IF is_akb_event THEN
    -- Находим тесты АКБ
    SELECT id INTO v_entry_test_id
    FROM tests
    WHERE event_type_id = v_event_type_id 
      AND type = 'entry'
      AND title ILIKE '%Управление территорией для развития АКБ%'
      AND status = 'active'
    LIMIT 1;
    
    SELECT id INTO v_final_test_id
    FROM tests
    WHERE event_type_id = v_event_type_id 
      AND type = 'final'
      AND title ILIKE '%Управление территорией для развития АКБ%'
      AND status = 'active'
    LIMIT 1;
    
    SELECT id INTO v_annual_test_id
    FROM tests
    WHERE event_type_id = v_event_type_id 
      AND type = 'annual'
      AND title ILIKE '%Управление территорией для развития АКБ%'
      AND status = 'active'
    LIMIT 1;
    
    -- Назначаем тесты всем участникам АКБ (без проверки attended)
    IF v_entry_test_id IS NOT NULL THEN
      INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
      SELECT 
        v_user_id,
        v_entry_test_id,
        v_event_id,
        'in_progress',
        NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM user_test_attempts
        WHERE user_id = v_user_id 
          AND test_id = v_entry_test_id 
          AND event_id = v_event_id
      );
    END IF;
    
    IF v_final_test_id IS NOT NULL THEN
      INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
      SELECT 
        v_user_id,
        v_final_test_id,
        v_event_id,
        'pending',
        NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM user_test_attempts
        WHERE user_id = v_user_id 
          AND test_id = v_final_test_id 
          AND event_id = v_event_id
      );
    END IF;
    
    IF v_annual_test_id IS NOT NULL THEN
      INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
      SELECT 
        v_user_id,
        v_annual_test_id,
        v_event_id,
        'pending',
        NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM user_test_attempts
        WHERE user_id = v_user_id 
          AND test_id = v_annual_test_id 
          AND event_id = v_event_id
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Для остальных мероприятий оставляем старую логику (только для attended = true)
  IF NEW.attended = true THEN
    -- Находим ID входного и финального тестов
    SELECT id INTO v_entry_test_id
    FROM tests
    WHERE event_type_id = v_event_type_id AND type = 'entry' AND status = 'active'
    LIMIT 1;
    
    SELECT id INTO v_final_test_id
    FROM tests
    WHERE event_type_id = v_event_type_id AND type = 'final' AND status = 'active'
    LIMIT 1;
    
    -- Назначаем входной тест, если он существует и еще не назначен
    IF v_entry_test_id IS NOT NULL THEN
      INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
      SELECT 
        v_user_id,
        v_entry_test_id,
        v_event_id,
        'in_progress',
        NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM user_test_attempts
        WHERE user_id = v_user_id 
          AND test_id = v_entry_test_id 
          AND event_id = v_event_id
      );
    END IF;
    
    -- Назначаем финальный тест независимо от статуса входного теста
    IF v_final_test_id IS NOT NULL THEN
      INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
      SELECT 
        v_user_id,
        v_final_test_id,
        v_event_id,
        'in_progress',
        NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM user_test_attempts
        WHERE user_id = v_user_id 
          AND test_id = v_final_test_id 
          AND event_id = v_event_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновляем комментарий к функции
COMMENT ON FUNCTION assign_akb_tests_to_participants() IS 
'Назначает тесты АКБ всем участникам мероприятия независимо от статуса присутствия';

COMMENT ON FUNCTION auto_assign_tests_to_participant() IS 
'Назначает тесты участникам: для АКБ мероприятий - всем участникам, для остальных - только присутствующим';
