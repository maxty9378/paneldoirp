-- Полная миграция для создания системы тестирования с поддержкой сохранения позиции
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Создаем таблицу для тестов (если не существует)
CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('entry', 'final', 'annual')),
  passing_score INTEGER DEFAULT 70,
  time_limit INTEGER DEFAULT 30,
  event_type_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Создаем таблицу для вопросов тестов (если не существует)
CREATE TABLE IF NOT EXISTS test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL,
  question TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single_choice' CHECK (question_type IN ('single_choice', 'multiple_choice', 'text', 'sequence')),
  "order" INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Создаем таблицу для вариантов ответов (если не существует)
CREATE TABLE IF NOT EXISTS test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Создаем таблицу для попыток прохождения тестов (если не существует)
CREATE TABLE IF NOT EXISTS user_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  test_id UUID NOT NULL,
  event_id UUID NOT NULL,
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Создаем таблицу для ответов пользователей (если не существует)
CREATE TABLE IF NOT EXISTS user_test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL,
  question_id UUID NOT NULL,
  answer_id UUID,
  text_answer TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Создаем таблицу для последовательных ответов (если не существует)
CREATE TABLE IF NOT EXISTS test_sequence_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  answer_text TEXT NOT NULL,
  answer_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Добавляем поле current_question_index в user_test_attempts (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'current_question_index'
    ) THEN
        ALTER TABLE user_test_attempts 
        ADD COLUMN current_question_index INTEGER DEFAULT 0;
        
        COMMENT ON COLUMN user_test_attempts.current_question_index IS 'Индекс текущего вопроса (0-based)';
        
        UPDATE user_test_attempts 
        SET current_question_index = 0 
        WHERE current_question_index IS NULL;
        
        RAISE NOTICE 'Поле current_question_index добавлено в таблицу user_test_attempts';
    ELSE
        RAISE NOTICE 'Поле current_question_index уже существует в таблице user_test_attempts';
    END IF;
END $$;

-- 8. Добавляем внешние ключи (если не существуют)
DO $$
BEGIN
    -- Добавляем внешний ключ для test_questions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'test_questions_test_id_fkey'
    ) THEN
        ALTER TABLE test_questions 
        ADD CONSTRAINT test_questions_test_id_fkey 
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE;
    END IF;

    -- Добавляем внешний ключ для test_answers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'test_answers_question_id_fkey'
    ) THEN
        ALTER TABLE test_answers 
        ADD CONSTRAINT test_answers_question_id_fkey 
        FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE;
    END IF;

    -- Добавляем внешний ключ для user_test_attempts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_test_attempts_user_id_fkey'
    ) THEN
        ALTER TABLE user_test_attempts 
        ADD CONSTRAINT user_test_attempts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_test_attempts_test_id_fkey'
    ) THEN
        ALTER TABLE user_test_attempts 
        ADD CONSTRAINT user_test_attempts_test_id_fkey 
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_test_attempts_event_id_fkey'
    ) THEN
        ALTER TABLE user_test_attempts 
        ADD CONSTRAINT user_test_attempts_event_id_fkey 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;

    -- Добавляем внешний ключ для user_test_answers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_test_answers_attempt_id_fkey'
    ) THEN
        ALTER TABLE user_test_answers 
        ADD CONSTRAINT user_test_answers_attempt_id_fkey 
        FOREIGN KEY (attempt_id) REFERENCES user_test_attempts(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_test_answers_question_id_fkey'
    ) THEN
        ALTER TABLE user_test_answers 
        ADD CONSTRAINT user_test_answers_question_id_fkey 
        FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_test_answers_answer_id_fkey'
    ) THEN
        ALTER TABLE user_test_answers 
        ADD CONSTRAINT user_test_answers_answer_id_fkey 
        FOREIGN KEY (answer_id) REFERENCES test_answers(id) ON DELETE SET NULL;
    END IF;

    -- Добавляем внешний ключ для test_sequence_answers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'test_sequence_answers_question_id_fkey'
    ) THEN
        ALTER TABLE test_sequence_answers 
        ADD CONSTRAINT test_sequence_answers_question_id_fkey 
        FOREIGN KEY (question_id) REFERENCES test_questions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 9. Создаем индексы (если не существуют)
CREATE INDEX IF NOT EXISTS tests_event_type_id_idx ON tests(event_type_id);
CREATE INDEX IF NOT EXISTS test_questions_test_id_idx ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS test_answers_question_id_idx ON test_answers(question_id);
CREATE INDEX IF NOT EXISTS user_test_attempts_user_id_idx ON user_test_attempts(user_id);
CREATE INDEX IF NOT EXISTS user_test_attempts_test_id_idx ON user_test_attempts(test_id);
CREATE INDEX IF NOT EXISTS user_test_attempts_event_id_idx ON user_test_attempts(event_id);
CREATE INDEX IF NOT EXISTS user_test_answers_attempt_id_idx ON user_test_answers(attempt_id);
CREATE INDEX IF NOT EXISTS test_sequence_answers_question_id_idx ON test_sequence_answers(question_id);

-- 10. Включаем RLS для всех таблиц
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sequence_answers ENABLE ROW LEVEL SECURITY;

-- 11. Создаем функцию для обновления updated_at (если не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 12. Создаем триггеры для обновления updated_at (если не существуют)
DO $$
BEGIN
    -- Триггер для tests
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_tests_updated_at'
    ) THEN
        CREATE TRIGGER update_tests_updated_at
        BEFORE UPDATE ON tests
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Триггер для test_questions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_test_questions_updated_at'
    ) THEN
        CREATE TRIGGER update_test_questions_updated_at
        BEFORE UPDATE ON test_questions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Триггер для test_answers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_test_answers_updated_at'
    ) THEN
        CREATE TRIGGER update_test_answers_updated_at
        BEFORE UPDATE ON test_answers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Триггер для user_test_attempts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_user_test_attempts_updated_at'
    ) THEN
        CREATE TRIGGER update_user_test_attempts_updated_at
        BEFORE UPDATE ON user_test_attempts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Триггер для user_test_answers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_user_test_answers_updated_at'
    ) THEN
        CREATE TRIGGER update_user_test_answers_updated_at
        BEFORE UPDATE ON user_test_answers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;

    -- Триггер для test_sequence_answers
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_test_sequence_answers_updated_at'
    ) THEN
        CREATE TRIGGER update_test_sequence_answers_updated_at
        BEFORE UPDATE ON test_sequence_answers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 13. Создаем RLS политики (если не существуют)
DO $$
BEGIN
    -- Политики для tests
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tests' AND policyname = 'Users can view active tests'
    ) THEN
        CREATE POLICY "Users can view active tests"
        ON tests
        FOR SELECT
        TO authenticated
        USING (status = 'active' OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()::text
          AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
        ));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tests' AND policyname = 'Admins can manage tests'
    ) THEN
        CREATE POLICY "Admins can manage tests"
        ON tests
        FOR ALL
        TO authenticated
        USING (EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()::text
          AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()::text
          AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
        ));
    END IF;

    -- Политики для user_test_attempts
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_test_attempts' AND policyname = 'Users can view their own test attempts'
    ) THEN
        CREATE POLICY "Users can view their own test attempts"
        ON user_test_attempts
        FOR SELECT
        TO authenticated
        USING (
          user_id = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
            AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_test_attempts' AND policyname = 'Users can create their own test attempts'
    ) THEN
        CREATE POLICY "Users can create their own test attempts"
        ON user_test_attempts
        FOR INSERT
        TO authenticated
        WITH CHECK (
          user_id = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
            AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_test_attempts' AND policyname = 'Users can update their own test attempts'
    ) THEN
        CREATE POLICY "Users can update their own test attempts"
        ON user_test_attempts
        FOR UPDATE
        TO authenticated
        USING (
          user_id = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
            AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
          )
        )
        WITH CHECK (
          user_id = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()::text
            AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
          )
        );
    END IF;

    -- Политики для user_test_answers
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_test_answers' AND policyname = 'Users can view their own test answers'
    ) THEN
        CREATE POLICY "Users can view their own test answers"
        ON user_test_answers
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_test_attempts
            WHERE user_test_attempts.id = user_test_answers.attempt_id
            AND (
              user_test_attempts.user_id = auth.uid()::text
              OR EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()::text
                AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
              )
            )
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_test_answers' AND policyname = 'Users can create their own test answers'
    ) THEN
        CREATE POLICY "Users can create their own test answers"
        ON user_test_answers
        FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM user_test_attempts
            WHERE user_test_attempts.id = user_test_answers.attempt_id
            AND (
              user_test_attempts.user_id = auth.uid()::text
              OR EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()::text
                AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
              )
            )
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_test_answers' AND policyname = 'Users can update their own test answers'
    ) THEN
        CREATE POLICY "Users can update their own test answers"
        ON user_test_answers
        FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_test_attempts
            WHERE user_test_attempts.id = user_test_answers.attempt_id
            AND (
              user_test_attempts.user_id = auth.uid()::text
              OR EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()::text
                AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
              )
            )
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM user_test_attempts
            WHERE user_test_attempts.id = user_test_answers.attempt_id
            AND (
              user_test_attempts.user_id = auth.uid()::text
              OR EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()::text
                AND users.role IN ('administrator', 'moderator', 'trainer', 'expert')
              )
            )
          )
        );
    END IF;
END $$;

-- 14. Проверяем результат
SELECT 
    'Migration completed successfully!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_test_attempts') as user_test_attempts_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_test_attempts' AND column_name = 'current_question_index') as current_question_index_exists;
