/*
  # Исправление функции для проверки статуса обратной связи
  
  1. Изменения
    - Обновлена функция should_show_feedback_form для исправления ошибки с несуществующей колонкой ft.events
    - Упрощена логика проверки доступности форм обратной связи
    - Учтена обратная связь от пользователя: для заполнения не требуется успешное прохождение тестов
  
  2. Доступность форм обратной связи
    - Проверяется только факт завершения тестов, а не успешность их прохождения
*/

-- Удаляем существующую функцию
DROP FUNCTION IF EXISTS should_show_feedback_form(uuid, uuid);

-- Создаем обновленную функцию для проверки, может ли пользователь заполнить форму обратной связи
CREATE OR REPLACE FUNCTION should_show_feedback_form(
  p_user_id uuid,
  p_event_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_type_id uuid;
  v_has_feedback_form boolean := false;
  v_has_entry_test boolean := false;
  v_has_final_test boolean := false;
  v_is_participant boolean := false;
  v_entry_test_completed boolean := true;
  v_final_test_completed boolean := true;
  v_has_submitted boolean := false;
BEGIN
  -- Проверяем, заполнил ли пользователь уже обратную связь
  SELECT EXISTS(
    SELECT 1
    FROM feedback_submissions fs
    WHERE fs.event_id = p_event_id
    AND fs.user_id = p_user_id
  ) INTO v_has_submitted;
  
  -- Если обратная связь уже отправлена, возвращаем false
  IF v_has_submitted THEN
    RETURN false;
  END IF;

  -- Проверяем, что пользователь участвует в мероприятии и присутствовал
  SELECT ep.attended, e.event_type_id
  INTO v_is_participant, v_event_type_id
  FROM event_participants ep
  JOIN events e ON e.id = ep.event_id
  WHERE ep.user_id = p_user_id 
    AND ep.event_id = p_event_id
    AND ep.attended = true;
  
  -- Если пользователь не участвует в мероприятии, возвращаем false
  IF NOT FOUND OR NOT v_is_participant THEN
    RETURN false;
  END IF;
  
  -- Получаем информацию о типе мероприятия
  SELECT 
    has_feedback_form,
    has_entry_test,
    has_final_test
  INTO 
    v_has_feedback_form,
    v_has_entry_test,
    v_has_final_test
  FROM event_types
  WHERE id = v_event_type_id;
  
  -- Если нет формы обратной связи для этого типа мероприятия
  IF NOT v_has_feedback_form THEN
    RETURN false;
  END IF;
  
  -- Проверяем, что существует шаблон обратной связи для этого типа мероприятия
  IF NOT EXISTS (
    SELECT 1
    FROM feedback_templates ft
    WHERE ft.event_type_id = v_event_type_id
    AND ft.is_default = true
  ) THEN
    RETURN false;
  END IF;
  
  -- Проверяем входной тест, если он требуется - только завершение, не проверяем успешность
  IF v_has_entry_test THEN
    SELECT EXISTS(
      SELECT 1 
      FROM user_test_attempts uta
      JOIN tests t ON t.id = uta.test_id
      WHERE uta.user_id = p_user_id
        AND uta.event_id = p_event_id
        AND t.type = 'entry'
        AND t.event_type_id = v_event_type_id
        AND uta.status = 'completed'
    ) INTO v_entry_test_completed;
  END IF;
  
  -- Проверяем финальный тест, если он требуется - только завершение, не проверяем успешность
  IF v_has_final_test THEN
    SELECT EXISTS(
      SELECT 1 
      FROM user_test_attempts uta
      JOIN tests t ON t.id = uta.test_id
      WHERE uta.user_id = p_user_id
        AND uta.event_id = p_event_id
        AND t.type = 'final'
        AND t.event_type_id = v_event_type_id
        AND uta.status = 'completed'
    ) INTO v_final_test_completed;
  END IF;
  
  -- Возвращаем true только если все условия выполнены
  RETURN v_entry_test_completed AND v_final_test_completed;
  
EXCEPTION
  WHEN OTHERS THEN
    -- В случае ошибки возвращаем false
    RETURN false;
END;
$$;

-- Даем права на выполнение функции аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION should_show_feedback_form(uuid, uuid) TO authenticated;

-- Комментарий к функции
COMMENT ON FUNCTION should_show_feedback_form IS 'Проверяет, может ли пользователь заполнить форму обратной связи для мероприятия. Требуется только завершение тестов, независимо от результата.';

-- Обновляем отображение статуса feedback_submitted в таблице event_participants
UPDATE event_participants ep
SET feedback_submitted = EXISTS (
  SELECT 1
  FROM feedback_submissions fs
  WHERE fs.event_id = ep.event_id 
  AND fs.user_id = ep.user_id
);

-- Улучшаем функцию обновления статуса обратной связи
CREATE OR REPLACE FUNCTION update_feedback_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE event_participants
  SET feedback_submitted = true
  WHERE event_id = NEW.event_id
    AND user_id = NEW.user_id;
    
  -- Добавляем запись в лог для отладки
  INSERT INTO admin_logs (
    action,
    resource_type,
    resource_id,
    success,
    new_values
  ) VALUES (
    'feedback_submitted',
    'feedback_submissions',
    NEW.id,
    TRUE,
    jsonb_build_object(
      'user_id', NEW.user_id,
      'event_id', NEW.event_id,
      'timestamp', NOW()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;