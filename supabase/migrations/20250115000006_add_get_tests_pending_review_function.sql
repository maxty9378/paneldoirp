-- Создание RPC функции для получения тестов на проверке
CREATE OR REPLACE FUNCTION get_tests_pending_review(p_event_id UUID DEFAULT NULL)
RETURNS TABLE (
  attempt_id UUID,
  user_name TEXT,
  user_email TEXT,
  test_title TEXT,
  test_type TEXT,
  submitted_at TIMESTAMPTZ,
  open_questions_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uta.id as attempt_id,
    u.full_name as user_name,
    u.email as user_email,
    t.title as test_title,
    t.type as test_type,
    uta.completed_at as submitted_at,
    COUNT(tq.id) as open_questions_count
  FROM user_test_attempts uta
  JOIN users u ON uta.user_id = u.id
  JOIN tests t ON uta.test_id = t.id
  LEFT JOIN test_questions tq ON t.id = tq.test_id AND tq.question_type = 'text'
  WHERE uta.status = 'pending_review'
    AND (p_event_id IS NULL OR uta.event_id = p_event_id)
  GROUP BY uta.id, u.full_name, u.email, t.title, t.type, uta.completed_at
  ORDER BY uta.completed_at DESC;
END;
$$;

-- Предоставляем права на выполнение функции
GRANT EXECUTE ON FUNCTION get_tests_pending_review(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tests_pending_review(UUID) TO anon;
