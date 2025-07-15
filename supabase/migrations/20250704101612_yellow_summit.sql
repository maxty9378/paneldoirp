-- Обновляем функцию назначения тестов
CREATE OR REPLACE FUNCTION auto_assign_tests_to_participant()
RETURNS trigger AS $$
DECLARE
  v_event_id UUID;
  v_user_id UUID;
  v_event_type_id UUID;
  v_entry_test_id UUID;
  v_final_test_id UUID;
  v_entry_test_complete BOOLEAN;
  v_entry_test_score INT;
  v_start_date TIMESTAMP;
BEGIN
  -- Получаем базовые данные
  v_event_id := NEW.event_id;
  v_user_id := NEW.user_id;
  
  -- Проверяем, что участник отмечен как присутствующий
  IF NEW.attended = true THEN
    -- Получаем данные о мероприятии
    SELECT e.event_type_id, e.start_date INTO v_event_type_id, v_start_date
    FROM events e WHERE e.id = v_event_id;
    
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
      
      -- Проверяем, пройден ли входной тест
      SELECT 
        status = 'completed',
        COALESCE(score, 0)
      INTO v_entry_test_complete, v_entry_test_score
      FROM user_test_attempts
      WHERE user_id = v_user_id
        AND test_id = v_entry_test_id
        AND event_id = v_event_id;
        
      -- Назначаем финальный тест только если входной тест пройден и успешно (оценка >= 70%)
      IF v_entry_test_complete = true AND v_entry_test_score >= 70 AND v_final_test_id IS NOT NULL THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для проверки возможности прохождения годового теста
CREATE OR REPLACE FUNCTION check_and_assign_annual_test(
  p_event_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_event_type_id UUID;
  v_event_date TIMESTAMP;
  v_annual_test_id UUID;
  v_entry_test_complete BOOLEAN := false;
  v_entry_test_score INT := 0;
  v_final_test_complete BOOLEAN := false;
  v_final_test_score INT := 0;
  v_three_months_ago TIMESTAMP := NOW() - INTERVAL '3 months';
  v_event_title TEXT;
BEGIN
  -- Получаем данные о мероприятии
  SELECT e.event_type_id, e.start_date, e.title
  INTO v_event_type_id, v_event_date, v_event_title
  FROM events e
  WHERE e.id = p_event_id;
  
  -- Проверяем, прошло ли 3 месяца с даты мероприятия
  IF v_event_date > v_three_months_ago THEN
    RETURN false; -- Еще не прошло 3 месяца
  END IF;
  
  -- Находим ID годового теста
  SELECT id INTO v_annual_test_id
  FROM tests
  WHERE event_type_id = v_event_type_id 
    AND type = 'annual' 
    AND status = 'active'
  LIMIT 1;
  
  -- Если годового теста нет, выходим
  IF v_annual_test_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Проверяем, пройдены ли входной и финальный тесты
  -- Входной тест
  SELECT 
    status = 'completed',
    COALESCE(score, 0)
  INTO v_entry_test_complete, v_entry_test_score
  FROM user_test_attempts uta
  JOIN tests t ON uta.test_id = t.id
  WHERE uta.user_id = p_user_id
    AND uta.event_id = p_event_id
    AND t.type = 'entry'
  LIMIT 1;
  
  -- Финальный тест
  SELECT 
    status = 'completed',
    COALESCE(score, 0)
  INTO v_final_test_complete, v_final_test_score
  FROM user_test_attempts uta
  JOIN tests t ON uta.test_id = t.id
  WHERE uta.user_id = p_user_id
    AND uta.event_id = p_event_id
    AND t.type = 'final'
  LIMIT 1;
  
  -- Назначаем годовой тест только если оба предыдущих теста пройдены успешно
  IF (v_entry_test_complete AND v_entry_test_score >= 70) AND 
     (v_final_test_complete AND v_final_test_score >= 70) THEN
    -- Проверяем, не назначен ли уже годовой тест
    IF NOT EXISTS (
      SELECT 1 FROM user_test_attempts
      WHERE user_id = p_user_id 
        AND test_id = v_annual_test_id
        AND event_id = p_event_id
    ) THEN
      -- Назначаем годовой тест
      INSERT INTO user_test_attempts (
        user_id,
        test_id,
        event_id,
        status,
        start_time
      ) VALUES (
        p_user_id,
        v_annual_test_id,
        p_event_id,
        'in_progress',
        NOW()
      );
      
      -- Создаем уведомление о назначении годового теста
      INSERT INTO notification_tasks (
        user_id,
        title,
        description,
        type,
        priority,
        status,
        metadata
      ) VALUES (
        p_user_id,
        'Пройдите годовой тест',
        'Прошло 3 месяца с тренинга "' || v_event_title || '". Пора пройти годовой тест для закрепления знаний.',
        'test_reminder',
        'high',
        'pending',
        jsonb_build_object(
          'event_id', p_event_id,
          'test_id', v_annual_test_id,
          'event_title', v_event_title,
          'assignment_date', NOW()
        )
      );
      
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Добавляем триггерную функцию для автоматической проверки годовых тестов раз в день
CREATE OR REPLACE FUNCTION check_annual_test_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  event_record RECORD;
  participant_record RECORD;
BEGIN
  -- Проверяем право на прохождение годового теста для всех участников мероприятия
  IF (
    -- Проверяем, что это полночь (для запуска раз в день)
    EXTRACT(HOUR FROM NEW.created_at) = 0 AND
    EXTRACT(MINUTE FROM NEW.created_at) < 5
  ) THEN
    -- Находим все мероприятия, которые прошли более 3 месяцев назад
    FOR event_record IN
      SELECT id, title, start_date
      FROM events
      WHERE start_date < (NOW() - INTERVAL '3 months')
    LOOP
      -- Для каждого мероприятия находим всех присутствовавших участников
      FOR participant_record IN
        SELECT user_id
        FROM event_participants
        WHERE event_id = event_record.id
          AND attended = true
      LOOP
        -- Проверяем возможность и назначаем годовой тест
        PERFORM check_and_assign_annual_test(
          event_record.id,
          participant_record.user_id
        );
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Добавим задачу по расписанию на проверку годовых тестов
-- В реальном окружении здесь бы использовались внешние планировщики задач,
-- но в целях демонстрации добавим триггер на таблицу admin_logs
DROP TRIGGER IF EXISTS trigger_check_annual_tests ON admin_logs;

CREATE TRIGGER trigger_check_annual_tests
  AFTER INSERT ON admin_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_annual_test_eligibility();

-- Добавляем комментарий к функциям
COMMENT ON FUNCTION auto_assign_tests_to_participant() IS 
  'Автоматически назначает тесты участникам мероприятий. Назначает финальный тест только после успешного прохождения входного.';

COMMENT ON FUNCTION check_and_assign_annual_test(UUID, UUID) IS
  'Проверяет возможность прохождения годового теста (прошло ли 3 месяца с мероприятия и пройдены ли предыдущие тесты).';

COMMENT ON FUNCTION check_annual_test_eligibility() IS
  'Функция для периодической проверки и назначения годовых тестов.';