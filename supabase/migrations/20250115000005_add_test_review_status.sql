/*
  # Добавление статуса проверки для тестов с открытыми вопросами

  1. Изменения в схеме
    - Добавляем новый статус 'pending_review' для user_test_attempts
    - Добавляем поля для проверки тестов
    - Создаем таблицу для проверок тестов

  2. Безопасность
    - Добавляем политики для проверки тестов
    - Ограничиваем доступ к проверке только тренерам и администраторам
*/

-- Обновляем CHECK constraint для добавления нового статуса
ALTER TABLE user_test_attempts 
DROP CONSTRAINT IF EXISTS user_test_attempts_status_check;

ALTER TABLE user_test_attempts 
ADD CONSTRAINT user_test_attempts_status_check 
CHECK (status IN ('in_progress', 'completed', 'failed', 'pending_review'));

-- Добавляем поля для проверки тестов
ALTER TABLE user_test_attempts 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS review_score INTEGER;

-- Создаем таблицу для детальной проверки ответов
CREATE TABLE IF NOT EXISTS test_answer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES user_test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  user_answer_id UUID REFERENCES user_test_answers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  is_correct BOOLEAN NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_test_attempts_pending_review 
ON user_test_attempts(status) 
WHERE status = 'pending_review';

CREATE INDEX IF NOT EXISTS idx_test_answer_reviews_attempt_id 
ON test_answer_reviews(attempt_id);

CREATE INDEX IF NOT EXISTS idx_test_answer_reviews_reviewer_id 
ON test_answer_reviews(reviewer_id);

-- Создаем триггер для обновления updated_at
CREATE TRIGGER update_test_answer_reviews_updated_at
BEFORE UPDATE ON test_answer_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Функция для автоматического определения статуса теста
CREATE OR REPLACE FUNCTION determine_test_status(
  p_attempt_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_has_open_questions BOOLEAN := false;
  v_all_answered BOOLEAN := true;
  v_test_id UUID;
  v_passing_score INTEGER;
  v_total_score INTEGER := 0;
  v_attempt_score INTEGER;
BEGIN
  -- Получаем информацию о тесте
  SELECT uta.test_id, t.passing_score, uta.score
  INTO v_test_id, v_passing_score, v_attempt_score
  FROM user_test_attempts uta
  JOIN tests t ON t.id = uta.test_id
  WHERE uta.id = p_attempt_id;
  
  -- Проверяем, есть ли открытые вопросы (text или sequence)
  SELECT EXISTS(
    SELECT 1 
    FROM test_questions tq 
    WHERE tq.test_id = v_test_id 
    AND tq.question_type IN ('text', 'sequence')
  ) INTO v_has_open_questions;
  
  -- Если нет открытых вопросов, используем стандартную логику
  IF NOT v_has_open_questions THEN
    IF v_attempt_score >= v_passing_score THEN
      RETURN 'completed';
    ELSE
      RETURN 'failed';
    END IF;
  END IF;
  
  -- Проверяем, все ли вопросы отвечены
  SELECT NOT EXISTS(
    SELECT 1 
    FROM test_questions tq
    LEFT JOIN user_test_answers uta ON uta.question_id = tq.id AND uta.attempt_id = p_attempt_id
    WHERE tq.test_id = v_test_id 
    AND uta.id IS NULL
  ) INTO v_all_answered;
  
  -- Если не все вопросы отвечены, тест еще в процессе
  IF NOT v_all_answered THEN
    RETURN 'in_progress';
  END IF;
  
  -- Если есть открытые вопросы и все отвечены, нужна проверка
  RETURN 'pending_review';
END;
$$ LANGUAGE plpgsql;

-- Функция для проверки теста тренером/администратором
CREATE OR REPLACE FUNCTION review_test_attempt(
  p_attempt_id UUID,
  p_reviewer_id UUID,
  p_review_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_attempt_status TEXT;
  v_test_id UUID;
  v_passing_score INTEGER;
  v_total_points INTEGER := 0;
  v_awarded_points INTEGER := 0;
  v_question RECORD;
BEGIN
  -- Проверяем, что попытка существует и ожидает проверки
  SELECT status, test_id
  INTO v_attempt_status, v_test_id
  FROM user_test_attempts
  WHERE id = p_attempt_id;
  
  IF v_attempt_status != 'pending_review' THEN
    RAISE EXCEPTION 'Тест не ожидает проверки';
  END IF;
  
  -- Получаем проходной балл
  SELECT passing_score INTO v_passing_score
  FROM tests
  WHERE id = v_test_id;
  
  -- Подсчитываем общие баллы и начисленные баллы
  SELECT 
    SUM(tq.points) as total,
    COALESCE(SUM(tar.points_awarded), 0) as awarded
  INTO v_total_points, v_awarded_points
  FROM test_questions tq
  LEFT JOIN test_answer_reviews tar ON tar.question_id = tq.id AND tar.attempt_id = p_attempt_id
  WHERE tq.test_id = v_test_id;
  
  -- Если не все вопросы проверены, возвращаем false
  IF v_awarded_points = 0 OR v_awarded_points < v_total_points THEN
    RETURN false;
  END IF;
  
  -- Обновляем статус попытки
  UPDATE user_test_attempts
  SET 
    status = CASE 
      WHEN v_awarded_points >= v_passing_score THEN 'completed'
      ELSE 'failed'
    END,
    score = v_awarded_points,
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    review_notes = p_review_notes
  WHERE id = p_attempt_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Политики безопасности
CREATE POLICY "Тренеры и администраторы могут просматривать тесты на проверке"
ON user_test_attempts FOR SELECT
TO authenticated
USING (
  status = 'pending_review' AND
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('administrator', 'trainer')
  )
);

CREATE POLICY "Тренеры и администраторы могут проверять тесты"
ON test_answer_reviews FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('administrator', 'trainer')
  )
);

-- Функция для получения тестов, ожидающих проверки
CREATE OR REPLACE FUNCTION get_tests_pending_review(
  p_event_id UUID DEFAULT NULL
) RETURNS TABLE (
  attempt_id UUID,
  user_name TEXT,
  user_email TEXT,
  test_title TEXT,
  test_type TEXT,
  submitted_at TIMESTAMPTZ,
  open_questions_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uta.id as attempt_id,
    CONCAT(u.first_name, ' ', u.last_name) as user_name,
    u.email as user_email,
    t.title as test_title,
    t.type as test_type,
    uta.updated_at as submitted_at,
    COUNT(tq.id)::INTEGER as open_questions_count
  FROM user_test_attempts uta
  JOIN users u ON u.id = uta.user_id
  JOIN tests t ON t.id = uta.test_id
  JOIN test_questions tq ON tq.test_id = t.id AND tq.question_type IN ('text', 'sequence')
  WHERE uta.status = 'pending_review'
  AND (p_event_id IS NULL OR uta.event_id = p_event_id)
  GROUP BY uta.id, u.first_name, u.last_name, u.email, t.title, t.type, uta.updated_at
  ORDER BY uta.updated_at DESC;
END;
$$ LANGUAGE plpgsql;
