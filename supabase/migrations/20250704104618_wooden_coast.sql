/*
  # Обновление представления для тестов
  
  1. Новые таблицы
    - Нет новых таблиц
    
  2. Изменения
    - Добавлены RLS политики для тестов с более гибкими правилами доступа
    
  3. Безопасность
    - Улучшены RLS политики для доступа к тестам и попыткам прохождения
*/

-- Добавляем обновленные политики для улучшенного доступа к тестам
DROP POLICY IF EXISTS "Users can view available tests for events" ON tests;

CREATE POLICY "Users can view available tests for events" ON tests
  FOR SELECT
  TO authenticated
  USING (
    -- Тесты видны тем, кто участвовал в мероприятиях с этим типом тестов
    (EXISTS (
      SELECT 1 
      FROM events e
      JOIN event_participants ep ON e.id = ep.event_id
      WHERE e.event_type_id = tests.event_type_id
        AND ep.user_id = auth.uid()
        AND ep.attended = true
    ))
    OR 
    -- Или администраторам, модераторам, тренерам и экспертам
    (EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum, 'trainer'::user_role_enum, 'expert'::user_role_enum])
    ))
  );

-- Обновляем политику для попыток прохождения тестов
DROP POLICY IF EXISTS "Users can update their tests" ON user_test_attempts;
CREATE POLICY "Users can update their tests" ON user_test_attempts
  FOR UPDATE
  TO authenticated
  USING (
    -- Пользователи могут обновлять свои собственные попытки
    user_id = auth.uid()
  )
  WITH CHECK (
    -- Проверяем, что пользователь обновляет свои попытки
    user_id = auth.uid()
  );

-- Добавляем функцию для получения информации о тестах для конкретного мероприятия
CREATE OR REPLACE FUNCTION get_tests_for_event(
  p_event_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  test_id UUID,
  test_title TEXT,
  test_type TEXT,
  passing_score INTEGER,
  time_limit INTEGER,
  status TEXT,
  attempt_id UUID,
  attempt_status TEXT,
  score INTEGER,
  is_completed BOOLEAN,
  is_passed BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_event_type_id UUID;
BEGIN
  -- Если пользователь не указан, используем текущего
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Получаем тип мероприятия
  SELECT event_type_id INTO v_event_type_id
  FROM events
  WHERE id = p_event_id;
  
  -- Возвращаем информацию о тестах и попытках
  RETURN QUERY
  SELECT 
    t.id AS test_id,
    t.title AS test_title,
    t.type AS test_type,
    t.passing_score,
    t.time_limit,
    t.status,
    uta.id AS attempt_id,
    uta.status AS attempt_status,
    uta.score,
    uta.status = 'completed' AS is_completed,
    CASE 
      WHEN uta.score IS NULL THEN false
      WHEN uta.score >= t.passing_score THEN true
      ELSE false
    END AS is_passed
  FROM tests t
  LEFT JOIN user_test_attempts uta ON 
    t.id = uta.test_id AND 
    uta.event_id = p_event_id AND
    uta.user_id = v_user_id
  WHERE t.event_type_id = v_event_type_id
    AND t.status = 'active'
  ORDER BY 
    CASE 
      WHEN t.type = 'entry' THEN 1
      WHEN t.type = 'final' THEN 2
      WHEN t.type = 'annual' THEN 3
      ELSE 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Добавляем комментарий к функции
COMMENT ON FUNCTION get_tests_for_event(UUID, UUID) IS 
  'Возвращает информацию о тестах и попытках прохождения для указанного мероприятия и пользователя';

-- Добавляем функцию для автоматического назначения тестов пользователю
CREATE OR REPLACE FUNCTION assign_test_to_user(
  p_user_id UUID,
  p_event_id UUID,
  p_test_type TEXT
) RETURNS UUID AS $$
DECLARE
  v_test_id UUID;
  v_attempt_id UUID;
  v_event_type_id UUID;
BEGIN
  -- Получаем тип мероприятия
  SELECT event_type_id INTO v_event_type_id
  FROM events
  WHERE id = p_event_id;
  
  -- Находим подходящий тест
  SELECT id INTO v_test_id
  FROM tests
  WHERE event_type_id = v_event_type_id
    AND type = p_test_type
    AND status = 'active'
  LIMIT 1;
  
  -- Если тест найден, создаем или получаем существующую попытку
  IF v_test_id IS NOT NULL THEN
    -- Проверяем, существует ли уже попытка
    SELECT id INTO v_attempt_id
    FROM user_test_attempts
    WHERE user_id = p_user_id
      AND test_id = v_test_id
      AND event_id = p_event_id
    LIMIT 1;
    
    -- Если попытки нет, создаем
    IF v_attempt_id IS NULL THEN
      INSERT INTO user_test_attempts (
        user_id, 
        test_id, 
        event_id, 
        status, 
        start_time
      ) VALUES (
        p_user_id,
        v_test_id,
        p_event_id,
        'in_progress',
        NOW()
      ) RETURNING id INTO v_attempt_id;
      
      -- Добавляем лог о назначении теста
      INSERT INTO admin_logs (
        action,
        resource_type,
        resource_id,
        success,
        new_values
      ) VALUES (
        'assign_test_auto',
        'user_test_attempts',
        v_attempt_id,
        TRUE,
        jsonb_build_object(
          'user_id', p_user_id,
          'test_id', v_test_id,
          'event_id', p_event_id,
          'test_type', p_test_type
        )
      );
    END IF;
    
    RETURN v_attempt_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Добавляем комментарий к функции
COMMENT ON FUNCTION assign_test_to_user(UUID, UUID, TEXT) IS 
  'Назначает тест указанного типа пользователю для конкретного мероприятия';