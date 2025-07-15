/*
  # Система обратной связи для мероприятий

  1. Новые Таблицы
    - `feedback_templates` - шаблоны обратной связи
    - `feedback_questions` - вопросы для шаблонов обратной связи
    - `feedback_submissions` - заполненные формы обратной связи
    - `feedback_answers` - ответы на вопросы обратной связи

  2. Изменения
    - Добавление связей с таблицами событий
    - Добавление стандартного шаблона для "Технология эффективных продаж"
    
  3. Безопасность
    - Включение RLS для всех таблиц
    - Добавление политик доступа
*/

-- Создаем таблицу шаблонов обратной связи
CREATE TABLE IF NOT EXISTS feedback_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  event_type_id uuid REFERENCES event_types(id),
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Добавляем расширенные данные для шаблонов
ALTER TABLE feedback_templates
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- Создаем таблицу вопросов для шаблонов обратной связи
CREATE TABLE IF NOT EXISTS feedback_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES feedback_templates(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type text NOT NULL DEFAULT 'rating',
  required boolean DEFAULT true,
  order_num integer NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаем таблицу заполненных форм обратной связи
CREATE TABLE IF NOT EXISTS feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  template_id uuid REFERENCES feedback_templates(id),
  overall_rating integer,
  comments text,
  is_anonymous boolean DEFAULT false,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаем таблицу ответов на вопросы обратной связи
CREATE TABLE IF NOT EXISTS feedback_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES feedback_submissions(id) ON DELETE CASCADE,
  question_id uuid REFERENCES feedback_questions(id),
  rating_value integer,
  text_value text,
  options_value jsonb,
  created_at timestamptz DEFAULT now()
);

-- Создаем функцию обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_feedback()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Добавляем триггеры для обновления updated_at
CREATE TRIGGER update_feedback_templates_updated_at
BEFORE UPDATE ON feedback_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_feedback();

CREATE TRIGGER update_feedback_questions_updated_at
BEFORE UPDATE ON feedback_questions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_feedback();

CREATE TRIGGER update_feedback_submissions_updated_at
BEFORE UPDATE ON feedback_submissions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_feedback();

-- Включаем Row Level Security
ALTER TABLE feedback_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_answers ENABLE ROW LEVEL SECURITY;

-- Добавляем политики доступа для шаблонов
CREATE POLICY "Administrators can manage feedback templates"
ON feedback_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('administrator', 'moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('administrator', 'moderator')
  )
);

CREATE POLICY "Everyone can view feedback templates"
ON feedback_templates
FOR SELECT
TO authenticated
USING (true);

-- Добавляем политики доступа для вопросов
CREATE POLICY "Administrators can manage feedback questions"
ON feedback_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('administrator', 'moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('administrator', 'moderator')
  )
);

CREATE POLICY "Everyone can view feedback questions"
ON feedback_questions
FOR SELECT
TO authenticated
USING (true);

-- Добавляем политики доступа для форм обратной связи
CREATE POLICY "Users can submit their own feedback"
ON feedback_submissions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own feedback submissions"
ON feedback_submissions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR 
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() 
    AND users.role IN ('administrator', 'moderator', 'trainer')
  )
);

-- Добавляем политики доступа для ответов
CREATE POLICY "Users can submit their own feedback answers"
ON feedback_answers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM feedback_submissions
    WHERE feedback_submissions.id = submission_id 
    AND feedback_submissions.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own feedback answers"
ON feedback_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM feedback_submissions
    WHERE feedback_submissions.id = submission_id 
    AND (
      feedback_submissions.user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid() 
        AND users.role IN ('administrator', 'moderator', 'trainer')
      )
    )
  )
);

-- Создаем функцию для получения статистики обратной связи
CREATE OR REPLACE FUNCTION get_event_feedback_stats(p_event_id UUID)
RETURNS TABLE(
  question_id UUID,
  question TEXT,
  question_type TEXT,
  average_rating NUMERIC,
  response_count INTEGER,
  responses JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fq.id AS question_id,
    fq.question,
    fq.question_type,
    CASE 
      WHEN fq.question_type = 'rating' THEN
        ROUND(AVG(fa.rating_value), 2)
      ELSE
        NULL
    END AS average_rating,
    COUNT(fa.id) AS response_count,
    jsonb_agg(
      jsonb_build_object(
        'value', COALESCE(fa.rating_value, 0),
        'user_id', fs.user_id,
        'submission_id', fs.id,
        'submitted_at', fs.submitted_at
      )
    ) AS responses
  FROM feedback_questions fq
  JOIN feedback_templates ft ON fq.template_id = ft.id
  JOIN feedback_submissions fs ON ft.id = fs.template_id
  LEFT JOIN feedback_answers fa ON fa.question_id = fq.id AND fa.submission_id = fs.id
  WHERE fs.event_id = p_event_id
  GROUP BY fq.id, fq.question, fq.question_type
  ORDER BY fq.order_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем индексы для оптимизации запросов
CREATE INDEX feedback_submissions_event_id_idx ON feedback_submissions(event_id);
CREATE INDEX feedback_submissions_user_id_idx ON feedback_submissions(user_id);
CREATE INDEX feedback_answers_submission_id_idx ON feedback_answers(submission_id);
CREATE INDEX feedback_answers_question_id_idx ON feedback_answers(question_id);
CREATE INDEX feedback_questions_template_id_idx ON feedback_questions(template_id);

-- Создаем стандартный шаблон обратной связи для "Технология эффективных продаж"
DO $$
DECLARE
  v_template_id UUID;
  v_event_type_id UUID;
BEGIN
  -- Находим ID типа мероприятия "online_training"
  SELECT id INTO v_event_type_id
  FROM event_types
  WHERE name = 'online_training'
  LIMIT 1;
  
  -- Создаем шаблон
  INSERT INTO feedback_templates (name, description, event_type_id, is_default)
  VALUES (
    'Оценка тренинга "Технология эффективных продаж"',
    'Стандартная форма обратной связи для оценки качества проведения тренинга',
    v_event_type_id,
    true
  )
  RETURNING id INTO v_template_id;
  
  -- Добавляем вопросы
  INSERT INTO feedback_questions (template_id, question, question_type, required, order_num)
  VALUES
    (v_template_id, 'Знание преподаваемого материала', 'rating', true, 1),
    (v_template_id, 'Умение связать теорию с практикой', 'rating', true, 2),
    (v_template_id, 'Способность заинтересовать аудиторию', 'rating', true, 3),
    (v_template_id, 'Доступность изложения материала', 'rating', true, 4),
    (v_template_id, 'Логичность и последовательность подачи информации', 'rating', true, 5),
    (v_template_id, 'Индивидуальный подход к участникам', 'rating', true, 6),
    (v_template_id, 'Динамичность проведения тренинга', 'rating', true, 7),
    (v_template_id, 'Полнота ответов на вопросы участников', 'rating', true, 8),
    (v_template_id, 'Общая оценка работы тренера', 'rating', true, 9),
    (v_template_id, 'Комментарии и предложения по улучшению', 'text', false, 10);
END;
$$;

-- Функция для проверки необходимости показа формы обратной связи
CREATE OR REPLACE FUNCTION should_show_feedback_form(
  p_user_id UUID, 
  p_event_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_entry_test_passed BOOLEAN := false;
  v_final_test_passed BOOLEAN := false;
  v_already_submitted BOOLEAN := false;
  v_has_feedback_template BOOLEAN := false;
BEGIN
  -- Проверяем, есть ли для мероприятия шаблон обратной связи
  SELECT EXISTS (
    SELECT 1
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    JOIN feedback_templates ft ON et.id = ft.event_type_id
    WHERE e.id = p_event_id AND (ft.is_default = true OR e.id = ANY(ft.events))
  ) INTO v_has_feedback_template;
  
  IF NOT v_has_feedback_template THEN
    RETURN false;
  END IF;
  
  -- Проверяем, заполнил ли уже пользователь обратную связь
  SELECT EXISTS (
    SELECT 1
    FROM feedback_submissions fs
    WHERE fs.event_id = p_event_id AND fs.user_id = p_user_id
  ) INTO v_already_submitted;
  
  IF v_already_submitted THEN
    RETURN false;
  END IF;
  
  -- Проверяем, прошел ли пользователь входной и финальный тесты
  SELECT EXISTS (
    SELECT 1
    FROM user_test_attempts uta
    JOIN tests t ON uta.test_id = t.id
    WHERE uta.event_id = p_event_id 
      AND uta.user_id = p_user_id
      AND t.type = 'entry'
      AND uta.status = 'completed'
      AND uta.score >= 70
  ) INTO v_entry_test_passed;
  
  SELECT EXISTS (
    SELECT 1
    FROM user_test_attempts uta
    JOIN tests t ON uta.test_id = t.id
    WHERE uta.event_id = p_event_id 
      AND uta.user_id = p_user_id
      AND t.type = 'final'
      AND uta.status = 'completed'
      AND uta.score >= 70
  ) INTO v_final_test_passed;
  
  -- Форма обратной связи показывается только после успешного прохождения входного и финального тестов
  RETURN (v_entry_test_passed AND v_final_test_passed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Добавляем индикатор наличия обратной связи в таблицу участников мероприятий
ALTER TABLE event_participants
ADD COLUMN IF NOT EXISTS feedback_submitted BOOLEAN DEFAULT false;

-- Добавляем триггер для обновления статуса обратной связи
CREATE OR REPLACE FUNCTION update_feedback_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE event_participants
  SET feedback_submitted = true
  WHERE event_id = NEW.event_id
    AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_feedback_submission
AFTER INSERT ON feedback_submissions
FOR EACH ROW
EXECUTE FUNCTION update_feedback_status();

-- Добавляем комментарии к таблицам
COMMENT ON TABLE feedback_templates IS 'Шаблоны форм обратной связи для разных типов мероприятий';
COMMENT ON TABLE feedback_questions IS 'Вопросы для шаблонов обратной связи';
COMMENT ON TABLE feedback_submissions IS 'Заполненные формы обратной связи от участников';
COMMENT ON TABLE feedback_answers IS 'Ответы участников на конкретные вопросы';