/*
  # Улучшение доступа к тестам

  1. Изменения
    - Обновлены политики доступа к тестам, чтобы участники всегда видели тесты своих мероприятий
    - Разрешён доступ к тестам тренерам и экспертам, даже если они не отмечены как присутствовавшие
*/

-- Обновляем политики для доступа к тестам
ALTER POLICY "Users can view their tests" ON tests
  USING (
    -- Пользователи могут видеть тесты, которые им назначены
    (EXISTS (
      SELECT 1 FROM user_test_attempts
      WHERE user_test_attempts.user_id = auth.uid()
      AND user_test_attempts.test_id = tests.id
    ))
    -- ИЛИ пользователи с административными ролями
    OR (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum, 'trainer'::user_role_enum, 'expert'::user_role_enum])
      )
    )
  );

-- Обновляем политику для видимости тестов участниками соответствующих мероприятий
ALTER POLICY "Users can view their relevant tests" ON tests
  USING (
    -- Пользователи могут видеть тесты мероприятий, в которых они участвуют
    (
      EXISTS (
        SELECT 1 
        FROM events e
        JOIN event_participants ep ON e.id = ep.event_id
        WHERE e.event_type_id = tests.event_type_id 
        AND ep.user_id = auth.uid()
      )
    )
    -- ИЛИ пользователи с административными ролями
    OR (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum, 'trainer'::user_role_enum, 'expert'::user_role_enum])
      )
    )
  );

-- Обновляем политики для попыток прохождения тестов
DROP POLICY IF EXISTS "Users can create their own test attempts" ON user_test_attempts;

CREATE POLICY "Users can create their own test attempts" ON user_test_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Пользователь может создавать попытки для себя
    (user_id = auth.uid())
    -- ИЛИ пользователь имеет административную роль
    OR (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum, 'trainer'::user_role_enum, 'expert'::user_role_enum])
      )
    )
  );

-- Разрешаем автоматически создавать попытки прохождения тестов для всех участников
CREATE OR REPLACE FUNCTION create_test_attempt_if_not_exists(
  p_user_id UUID,
  p_event_id UUID,
  p_test_type TEXT
) RETURNS UUID AS $$
DECLARE
  v_test_id UUID;
  v_attempt_id UUID;
BEGIN
  -- Находим ID теста нужного типа для мероприятия
  SELECT t.id INTO v_test_id
  FROM tests t
  JOIN events e ON t.event_type_id = e.event_type_id
  WHERE e.id = p_event_id
    AND t.type = p_test_type
    AND t.status = 'active'
  LIMIT 1;

  -- Если тест найден
  IF v_test_id IS NOT NULL THEN
    -- Проверяем, существует ли уже попытка
    SELECT id INTO v_attempt_id
    FROM user_test_attempts
    WHERE user_id = p_user_id
      AND test_id = v_test_id
      AND event_id = p_event_id
    LIMIT 1;

    -- Если попытки нет, создаем ее
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
    END IF;
  END IF;

  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;