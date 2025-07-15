/*
  # Убрать зависимость финального теста от входного теста

  1. Изменения
    - Обновлена функция auto_assign_tests_to_participant
    - Теперь финальный тест назначается независимо от входного теста
    - Удалена проверка на успешность входного теста при назначении финального

  2. Безопасность
    - Функция выполняется с правами владельца (SECURITY DEFINER)
    - Не меняет существующие данные
*/

-- Обновляем функцию назначения тестов
CREATE OR REPLACE FUNCTION auto_assign_tests_to_participant()
RETURNS trigger AS $$
DECLARE
  v_event_id UUID;
  v_user_id UUID;
  v_event_type_id UUID;
  v_entry_test_id UUID;
  v_final_test_id UUID;
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
COMMENT ON FUNCTION auto_assign_tests_to_participant() IS 
  'Автоматически назначает тесты участникам мероприятий. Входной и финальный тесты назначаются независимо друг от друга.';