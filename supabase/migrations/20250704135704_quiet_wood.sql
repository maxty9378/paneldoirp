/*
  # Создание функции проверки статуса обратной связи

  1. Новые функции
    - `should_show_feedback_form` - проверяет, может ли пользователь заполнить форму обратной связи
  
  2. Логика проверки
    - Пользователь должен участвовать в мероприятии (attended = true)
    - Тип мероприятия должен поддерживать обратную связь (has_feedback_form = true)
    - Если есть тесты, пользователь должен их успешно пройти
  
  3. Безопасность
    - Функция доступна только аутентифицированным пользователям
*/

-- Создаем функцию для проверки, может ли пользователь заполнить форму обратной связи
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
  v_entry_test_passed boolean := true;
  v_final_test_passed boolean := true;
BEGIN
  -- Проверяем, что пользователь участвует в мероприятии
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
  
  -- Проверяем входной тест, если он требуется
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
        AND uta.score >= t.passing_score
    ) INTO v_entry_test_passed;
  END IF;
  
  -- Проверяем финальный тест, если он требуется
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
        AND uta.score >= t.passing_score
    ) INTO v_final_test_passed;
  END IF;
  
  -- Возвращаем true только если все условия выполнены
  RETURN v_entry_test_passed AND v_final_test_passed;
  
EXCEPTION
  WHEN OTHERS THEN
    -- В случае ошибки возвращаем false
    RETURN false;
END;
$$;

-- Даем права на выполнение функции аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION should_show_feedback_form(uuid, uuid) TO authenticated;

-- Комментарий к функции
COMMENT ON FUNCTION should_show_feedback_form IS 'Проверяет, может ли пользователь заполнить форму обратной связи для мероприятия';