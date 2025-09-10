/*
  # Система тестирования

  1. Новые таблицы
    - `tests` - основная таблица с тестами
      - `id` (uuid, primary key)
      - `title` (text, название теста)
      - `description` (text, описание теста)
      - `type` (text, тип теста: entry, final, annual)
      - `passing_score` (integer, минимальный балл для прохождения)
      - `time_limit` (integer, ограничение времени в минутах)
      - `event_type_id` (uuid, ссылка на тип мероприятия)
      - `status` (text, статус теста: draft, active, inactive)
      - `created_at` (timestamp, дата создания)
      - `updated_at` (timestamp, дата обновления)
    
    - `test_questions` - вопросы тестов
      - `id` (uuid, primary key)
      - `test_id` (uuid, ссылка на тест)
      - `question` (text, текст вопроса)
      - `question_type` (text, тип вопроса: single_choice, multiple_choice, text)
      - `order` (integer, порядковый номер вопроса)
      - `points` (integer, количество баллов за вопрос)
      - `created_at` (timestamp, дата создания)
      - `updated_at` (timestamp, дата обновления)
    
    - `test_answers` - варианты ответов на вопросы
      - `id` (uuid, primary key)
      - `question_id` (uuid, ссылка на вопрос)
      - `text` (text, текст варианта ответа)
      - `is_correct` (boolean, правильный ли ответ)
      - `order` (integer, порядковый номер варианта)
      - `created_at` (timestamp, дата создания)
      - `updated_at` (timestamp, дата обновления)

    - `user_test_attempts` - попытки прохождения тестов пользователями
      - `id` (uuid, primary key)
      - `user_id` (uuid, ссылка на пользователя)
      - `test_id` (uuid, ссылка на тест)
      - `event_id` (uuid, ссылка на мероприятие)
      - `start_time` (timestamp, время начала теста)
      - `end_time` (timestamp, время завершения теста)
      - `score` (integer, набранные баллы)
      - `status` (text, статус: in_progress, completed, failed)
      - `created_at` (timestamp, дата создания)
      - `updated_at` (timestamp, дата обновления)

    - `user_test_answers` - ответы пользователей на вопросы тестов
      - `id` (uuid, primary key)
      - `attempt_id` (uuid, ссылка на попытку)
      - `question_id` (uuid, ссылка на вопрос)
      - `answer_id` (uuid, ссылка на вариант ответа)
      - `text_answer` (text, текстовый ответ для текстовых вопросов)
      - `is_correct` (boolean, правильность ответа)
      - `created_at` (timestamp, дата создания)
      - `updated_at` (timestamp, дата обновления)

  2. Безопасность
    - Включить RLS для всех таблиц
    - Добавить политики для администраторов, тренеров и пользователей
*/

-- Создаем таблицу для тестов
CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('entry', 'final', 'annual')),
  passing_score INTEGER DEFAULT 70,
  time_limit INTEGER DEFAULT 30,
  event_type_id UUID REFERENCES event_types(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создаем таблицу для вопросов тестов
CREATE TABLE test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single_choice' CHECK (question_type IN ('single_choice', 'multiple_choice', 'text')),
  "order" INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создаем таблицу для вариантов ответов
CREATE TABLE test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создаем таблицу для попыток прохождения тестов
CREATE TABLE user_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создаем таблицу для ответов пользователей
CREATE TABLE user_test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES user_test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES test_answers(id) ON DELETE SET NULL,
  text_answer TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создаем триггеры для обновления updated_at
CREATE TRIGGER update_tests_updated_at
BEFORE UPDATE ON tests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_questions_updated_at
BEFORE UPDATE ON test_questions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_answers_updated_at
BEFORE UPDATE ON test_answers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_test_attempts_updated_at
BEFORE UPDATE ON user_test_attempts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Добавляем индексы для оптимизации запросов
CREATE INDEX tests_event_type_id_idx ON tests(event_type_id);
CREATE INDEX test_questions_test_id_idx ON test_questions(test_id);
CREATE INDEX test_answers_question_id_idx ON test_answers(question_id);
CREATE INDEX user_test_attempts_user_id_idx ON user_test_attempts(user_id);
CREATE INDEX user_test_attempts_test_id_idx ON user_test_attempts(test_id);
CREATE INDEX user_test_attempts_event_id_idx ON user_test_attempts(event_id);
CREATE INDEX user_test_answers_attempt_id_idx ON user_test_answers(attempt_id);

-- Включаем RLS для всех таблиц
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_answers ENABLE ROW LEVEL SECURITY;

-- Создаем RLS политики для тестов
-- Все пользователи могут просматривать активные тесты
CREATE POLICY "Users can view active tests"
ON tests
FOR SELECT
TO authenticated
USING (status = 'active' OR EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
));

-- Администраторы, модераторы, тренеры и эксперты могут управлять тестами
CREATE POLICY "Admins can manage tests"
ON tests
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
));

-- Создаем RLS политики для вопросов тестов
CREATE POLICY "Users can view test questions"
ON test_questions
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM tests
  WHERE tests.id = test_questions.test_id
  AND (tests.status = 'active' OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  ))
));

CREATE POLICY "Admins can manage test questions"
ON test_questions
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
));

-- Создаем RLS политики для вариантов ответов
CREATE POLICY "Users can view test answers"
ON test_answers
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM test_questions
  JOIN tests ON tests.id = test_questions.test_id
  WHERE test_questions.id = test_answers.question_id
  AND (tests.status = 'active' OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  ))
));

CREATE POLICY "Admins can manage test answers"
ON test_answers
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
));

-- Создаем RLS политики для попыток прохождения тестов
CREATE POLICY "Users can view their own test attempts"
ON user_test_attempts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

CREATE POLICY "Users can create their own test attempts"
ON user_test_attempts
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

CREATE POLICY "Users can update their own test attempts"
ON user_test_attempts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
  )
);

-- Создаем RLS политики для ответов пользователей
CREATE POLICY "Users can view their own test answers"
ON user_test_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_test_attempts
    WHERE user_test_attempts.id = user_test_answers.attempt_id
    AND (
      user_test_attempts.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
      )
    )
  )
);

CREATE POLICY "Users can create their own test answers"
ON user_test_answers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_test_attempts
    WHERE user_test_attempts.id = user_test_answers.attempt_id
    AND (
      user_test_attempts.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
      )
    )
  )
);

-- Создаем стандартные тесты для "Технология эффективных продаж"
DO $$
DECLARE
  online_training_id UUID;
  entry_test_id UUID;
  final_test_id UUID;
  annual_test_id UUID;
BEGIN
  -- Получаем ID типа мероприятия "Онлайн-тренинг"
  SELECT id INTO online_training_id FROM event_types 
  WHERE name = 'online_training' LIMIT 1;
  
  IF online_training_id IS NOT NULL THEN
    -- Создаем входной тест
    INSERT INTO tests (title, description, type, passing_score, time_limit, event_type_id, status)
    VALUES (
      'Входной тест "Технология эффективных продаж"', 
      'Проверка базовых знаний перед началом обучения', 
      'entry', 
      60, -- проходной балл 60%
      20, -- 20 минут на выполнение
      online_training_id,
      'active'
    )
    RETURNING id INTO entry_test_id;
    
    -- Создаем финальный тест
    INSERT INTO tests (title, description, type, passing_score, time_limit, event_type_id, status)
    VALUES (
      'Итоговый тест "Технология эффективных продаж"', 
      'Проверка знаний после прохождения обучения', 
      'final', 
      70, -- проходной балл 70%
      30, -- 30 минут на выполнение
      online_training_id,
      'active'
    )
    RETURNING id INTO final_test_id;
    
    -- Создаем годовой тест
    INSERT INTO tests (title, description, type, passing_score, time_limit, event_type_id, status)
    VALUES (
      'Годовой тест "Технология эффективных продаж"', 
      'Проверка знаний спустя 3 месяца после обучения', 
      'annual', 
      75, -- проходной балл 75%
      45, -- 45 минут на выполнение
      online_training_id,
      'active'
    )
    RETURNING id INTO annual_test_id;
    
    -- Добавляем примеры вопросов для входного теста
    INSERT INTO test_questions (test_id, question, question_type, "order", points)
    VALUES
      (entry_test_id, 'Что такое СПИН-продажи?', 'single_choice', 1, 1),
      (entry_test_id, 'Какие виды возражений клиентов вы знаете? (выберите все подходящие варианты)', 'multiple_choice', 2, 2),
      (entry_test_id, 'Опишите своими словами основные этапы процесса продаж', 'text', 3, 3);
    
    -- Добавляем варианты ответов для первого вопроса входного теста
    INSERT INTO test_answers (question_id, text, is_correct, "order")
    VALUES
      ((SELECT id FROM test_questions WHERE test_id = entry_test_id AND "order" = 1), 'Техника продаж с использованием вопросов 4 типов: ситуационные, проблемные, извлекающие, направляющие', TRUE, 1),
      ((SELECT id FROM test_questions WHERE test_id = entry_test_id AND "order" = 1), 'Продажи специализированных товаров', FALSE, 2),
      ((SELECT id FROM test_questions WHERE test_id = entry_test_id AND "order" = 1), 'Методика быстрых продаж с возвратом комиссии', FALSE, 3),
      ((SELECT id FROM test_questions WHERE test_id = entry_test_id AND "order" = 1), 'Система планирования и оценки нагрузки', FALSE, 4);
    
    -- Добавляем варианты ответов для второго вопроса входного теста
    INSERT INTO test_answers (question_id, text, is_correct, "order")
    VALUES
      ((SELECT id FROM test_questions WHERE test_id = entry_test_id AND "order" = 2), 'Ценовые возражения', TRUE, 1),
      ((SELECT id FROM test_questions WHERE test_id = entry_test_id AND "order" = 2), 'Возражения по качеству', TRUE, 2),
      ((SELECT id FROM test_questions WHERE test_id = entry_test_id AND "order" = 2), 'Возражения по срокам', TRUE, 3),
      ((SELECT id FROM test_questions WHERE test_id = entry_test_id AND "order" = 2), 'Возражения на основе политических взглядов', FALSE, 4),
      ((SELECT id FROM test_questions WHERE test_id = entry_test_id AND "order" = 2), 'Возражения конкурентной борьбы', TRUE, 5);
    
    -- Добавляем примеры вопросов для финального теста
    INSERT INTO test_questions (test_id, question, question_type, "order", points)
    VALUES
      (final_test_id, 'Какие методы закрытия сделки были изучены на тренинге? (выберите все верные)', 'multiple_choice', 1, 2),
      (final_test_id, 'Опишите алгоритм работы с возражением клиента "У конкурентов дешевле"', 'text', 2, 3),
      (final_test_id, 'Что такое "золотые вопросы" в продажах?', 'single_choice', 3, 1);
    
    -- Добавляем варианты ответов для первого вопроса финального теста
    INSERT INTO test_answers (question_id, text, is_correct, "order")
    VALUES
      ((SELECT id FROM test_questions WHERE test_id = final_test_id AND "order" = 1), 'Метод альтернативы', TRUE, 1),
      ((SELECT id FROM test_questions WHERE test_id = final_test_id AND "order" = 1), 'Метод прямого закрытия', TRUE, 2),
      ((SELECT id FROM test_questions WHERE test_id = final_test_id AND "order" = 1), 'Метод "Коломбо"', TRUE, 3),
      ((SELECT id FROM test_questions WHERE test_id = final_test_id AND "order" = 1), 'Метод суммирования преимуществ', TRUE, 4),
      ((SELECT id FROM test_questions WHERE test_id = final_test_id AND "order" = 1), 'Метод "Круговой защиты"', FALSE, 5);
    
    -- Добавляем варианты ответов для третьего вопроса финального теста
    INSERT INTO test_answers (question_id, text, is_correct, "order")
    VALUES
      ((SELECT id FROM test_questions WHERE test_id = final_test_id AND "order" = 3), 'Вопросы, приводящие клиента к самостоятельному принятию решения о покупке', TRUE, 1),
      ((SELECT id FROM test_questions WHERE test_id = final_test_id AND "order" = 3), 'Вопросы о финансовом состоянии клиента', FALSE, 2),
      ((SELECT id FROM test_questions WHERE test_id = final_test_id AND "order" = 3), 'Вопросы, позволяющие определить кредитоспособность клиента', FALSE, 3),
      ((SELECT id FROM test_questions WHERE test_id = final_test_id AND "order" = 3), 'Вопросы, ускоряющие процесс продажи за счет пропуска этапов презентации', FALSE, 4);
    
    -- Добавляем примеры вопросов для годового теста
    INSERT INTO test_questions (test_id, question, question_type, "order", points)
    VALUES
      (annual_test_id, 'Какие методики из тренинга "Технология эффективных продаж" вы используете в своей работе? (выберите все подходящие)', 'multiple_choice', 1, 2),
      (annual_test_id, 'Опишите конкретный пример использования техники СПИН в вашей работе за последние 3 месяца', 'text', 2, 4),
      (annual_test_id, 'Какой средний прирост продаж дает правильное определение потребностей клиента?', 'single_choice', 3, 1);
    
    -- Добавляем варианты ответов для первого вопроса годового теста
    INSERT INTO test_answers (question_id, text, is_correct, "order")
    VALUES
      ((SELECT id FROM test_questions WHERE test_id = annual_test_id AND "order" = 1), 'СПИН-вопросы', TRUE, 1),
      ((SELECT id FROM test_questions WHERE test_id = annual_test_id AND "order" = 1), 'Работа с возражениями по методу "Свет-Признание-Вопрос-Ответ"', TRUE, 2),
      ((SELECT id FROM test_questions WHERE test_id = annual_test_id AND "order" = 1), 'Выявление скрытых потребностей', TRUE, 3),
      ((SELECT id FROM test_questions WHERE test_id = annual_test_id AND "order" = 1), 'Метод FOMO для закрытия сделок', TRUE, 4),
      ((SELECT id FROM test_questions WHERE test_id = annual_test_id AND "order" = 1), 'Методики манипуляции клиентом', FALSE, 5);
    
    -- Добавляем варианты ответов для третьего вопроса годового теста
    INSERT INTO test_answers (question_id, text, is_correct, "order")
    VALUES
      ((SELECT id FROM test_questions WHERE test_id = annual_test_id AND "order" = 3), 'До 15%', FALSE, 1),
      ((SELECT id FROM test_questions WHERE test_id = annual_test_id AND "order" = 3), '15-30%', FALSE, 2),
      ((SELECT id FROM test_questions WHERE test_id = annual_test_id AND "order" = 3), '30-50%', TRUE, 3),
      ((SELECT id FROM test_questions WHERE test_id = annual_test_id AND "order" = 3), 'Более 50%', FALSE, 4);
    
    RAISE NOTICE 'Стандартные тесты для "Технология эффективных продаж" успешно созданы';
  ELSE
    RAISE NOTICE 'Тип мероприятия "online_training" не найден, стандартные тесты не были созданы';
  END IF;
END $$;