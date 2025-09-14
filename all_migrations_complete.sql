-- =====================================================
-- ПОЛНЫЕ МИГРАЦИИ SNS TRAINING PLATFORM
-- =====================================================
-- Выполните этот файл через Supabase Dashboard → SQL Editor

-- =====================================================
-- 1. СОЗДАНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ ТЕСТИРОВАНИЯ
-- =====================================================

-- Создаем таблицу test_answers если её нет
CREATE TABLE IF NOT EXISTS test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  "order" integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаем таблицу user_test_answers если её нет
CREATE TABLE IF NOT EXISTS user_test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES user_test_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  answer_id uuid REFERENCES test_answers(id) ON DELETE CASCADE,
  answer_text text,
  is_correct boolean,
  points_awarded integer DEFAULT 0,
  answer_time_seconds integer DEFAULT 0,
  user_order integer[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_test_answers_question_id ON test_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_test_answers_attempt_id ON user_test_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_user_test_answers_question_id ON user_test_answers(question_id);

-- =====================================================
-- 2. БАЗОВЫЕ МИГРАЦИИ
-- =====================================================

-- Добавление поля current_question_index
ALTER TABLE user_test_attempts 
ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0;

COMMENT ON COLUMN user_test_attempts.current_question_index IS 'Индекс текущего вопроса (0-based)';

UPDATE user_test_attempts 
SET current_question_index = 0 
WHERE current_question_index IS NULL;

-- Добавляем колонку status если её нет
ALTER TABLE user_test_attempts 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';

-- Создаем CHECK constraint для status
ALTER TABLE user_test_attempts 
DROP CONSTRAINT IF EXISTS user_test_attempts_status_check;

ALTER TABLE user_test_attempts 
ADD CONSTRAINT user_test_attempts_status_check 
CHECK (status IN ('in_progress', 'completed', 'failed', 'pending_review'));

-- Обновляем существующие записи
UPDATE user_test_attempts 
SET status = CASE 
  WHEN completed_at IS NOT NULL THEN 'completed'
  ELSE 'in_progress'
END
WHERE status IS NULL;

-- Удаляем таблицу если она существует неправильно
DROP TABLE IF EXISTS tp_evaluations CASCADE;

-- Создаем таблицу tp_evaluations с правильной структурой
CREATE TABLE tp_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Личностные качества (high, medium, low)
  leadership_potential text NOT NULL CHECK (leadership_potential IN ('high', 'medium', 'low')),
  business_communication text NOT NULL CHECK (business_communication IN ('high', 'medium', 'low')),
  learning_ability text NOT NULL CHECK (learning_ability IN ('high', 'medium', 'low')),
  motivation_level text NOT NULL CHECK (motivation_level IN ('high', 'medium', 'low')),
  
  -- Навыки продаж (1-5)
  goal_setting integer NOT NULL CHECK (goal_setting BETWEEN 1 AND 5),
  client_contact integer NOT NULL CHECK (client_contact BETWEEN 1 AND 5),
  needs_identification integer NOT NULL CHECK (needs_identification BETWEEN 1 AND 5),
  presentation_demo integer NOT NULL CHECK (presentation_demo BETWEEN 1 AND 5),
  objection_handling integer NOT NULL CHECK (objection_handling BETWEEN 1 AND 5),
  new_client_connection integer NOT NULL CHECK (new_client_connection BETWEEN 1 AND 5),
  
  -- Дополнительные навыки продаж
  bonus_calculation integer NOT NULL DEFAULT 1 CHECK (bonus_calculation BETWEEN 1 AND 5),
  tools_usage integer NOT NULL DEFAULT 1 CHECK (tools_usage BETWEEN 1 AND 5),
  task_execution integer NOT NULL DEFAULT 1 CHECK (task_execution BETWEEN 1 AND 5),
  weekly_planning integer NOT NULL DEFAULT 1 CHECK (weekly_planning BETWEEN 1 AND 5),
  client_connection_skill integer NOT NULL DEFAULT 1 CHECK (client_connection_skill BETWEEN 1 AND 5),
  
  -- Автоматически вычисляемая средняя оценка
  average_skills_score decimal(3,2) NOT NULL DEFAULT 0,
  
  -- Дополнительные комментарии
  notes text,
  
  -- Метаданные
  evaluated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Уникальность: один тренер может оценить участника только один раз
  UNIQUE(event_id, participant_id, evaluator_id)
);

-- Включаем RLS
ALTER TABLE tp_evaluations ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Trainers can manage evaluations for their events" ON tp_evaluations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = tp_evaluations.event_id
      AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all evaluations" ON tp_evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('administrator', 'moderator')
    )
  );

CREATE POLICY "Participants can view their own evaluations" ON tp_evaluations
  FOR SELECT USING (participant_id = auth.uid());

-- Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_tp_evaluations_event_id ON tp_evaluations(event_id);
CREATE INDEX IF NOT EXISTS idx_tp_evaluations_participant_id ON tp_evaluations(participant_id);
CREATE INDEX IF NOT EXISTS idx_tp_evaluations_evaluator_id ON tp_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_tp_evaluations_evaluated_at ON tp_evaluations(evaluated_at);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_tp_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER trigger_update_tp_evaluations_updated_at
  BEFORE UPDATE ON tp_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_tp_evaluations_updated_at();

-- Функция для расчета средней оценки
CREATE OR REPLACE FUNCTION calculate_average_skills_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Рассчитываем среднюю оценку по новым 6 навыкам
  NEW.average_skills_score = (
    NEW.bonus_calculation + 
    NEW.tools_usage + 
    NEW.task_execution + 
    NEW.weekly_planning + 
    NEW.new_client_connection + 
    NEW.client_connection_skill
  ) / 6.0;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического расчета средней оценки
DROP TRIGGER IF EXISTS trigger_calculate_average_skills_score ON tp_evaluations;
CREATE TRIGGER trigger_calculate_average_skills_score
  BEFORE INSERT OR UPDATE ON tp_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION calculate_average_skills_score();

-- Создание таблицы для связи тренеров с территориями
CREATE TABLE IF NOT EXISTS trainer_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  territory_id uuid NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Уникальное ограничение: один тренер может быть назначен на одну территорию только один раз
  UNIQUE(trainer_id, territory_id)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_trainer_territories_trainer_id ON trainer_territories(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_territories_territory_id ON trainer_territories(territory_id);
CREATE INDEX IF NOT EXISTS idx_trainer_territories_is_active ON trainer_territories(is_active);

-- Включение RLS
ALTER TABLE trainer_territories ENABLE ROW LEVEL SECURITY;

-- Политика доступа: только администраторы могут управлять назначениями
CREATE POLICY "Administrators can manage trainer territories" ON trainer_territories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'administrator'
      AND users.is_active = true
    )
  );

-- Политика чтения для тренеров и модераторов
CREATE POLICY "Trainers and moderators can view trainer territories" ON trainer_territories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('trainer', 'moderator', 'administrator')
      AND users.is_active = true
    )
  );

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_trainer_territories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trainer_territories_updated_at
  BEFORE UPDATE ON trainer_territories
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_territories_updated_at();

-- Создаём таблицу для постоянных QR токенов
CREATE TABLE IF NOT EXISTS public.user_qr_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Создаём индексы
CREATE INDEX IF NOT EXISTS idx_user_qr_tokens_user_id ON public.user_qr_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_qr_tokens_token ON public.user_qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_qr_tokens_active ON public.user_qr_tokens(is_active);

-- RLS политики
ALTER TABLE public.user_qr_tokens ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои токены
CREATE POLICY "Users can view own QR tokens" ON public.user_qr_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Админы могут всё
CREATE POLICY "Admins can manage all QR tokens" ON public.user_qr_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'moderator')
    )
  );

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_user_qr_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления updated_at
DROP TRIGGER IF EXISTS trigger_update_user_qr_tokens_updated_at ON public.user_qr_tokens;
CREATE TRIGGER trigger_update_user_qr_tokens_updated_at
  BEFORE UPDATE ON public.user_qr_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_qr_tokens_updated_at();

-- Добавляем колонку order для управления последовательностью вопросов
ALTER TABLE test_questions 
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Создаем индекс для быстрой сортировки
CREATE INDEX IF NOT EXISTS idx_test_questions_order 
ON test_questions(test_id, "order", id);

-- Обновляем существующие записи, устанавливая order равным row_number для сохранения текущего порядка
UPDATE test_questions 
SET "order" = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) as row_num
  FROM test_questions
) as subquery
WHERE test_questions.id = subquery.id 
  AND (test_questions."order" IS NULL OR test_questions."order" = 0);

-- Комментарий к колонке
COMMENT ON COLUMN test_questions."order" IS 'Порядок отображения вопроса в тесте (меньше = выше)';

-- =====================================================
-- 3. МИГРАЦИИ ТЕСТИРОВАНИЯ
-- =====================================================

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

-- Проверяем существующий тип и добавляем недостающие значения
DO $$ 
BEGIN
    -- Проверяем, есть ли уже тип question_type_enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type_enum') THEN
        -- Добавляем значение 'sequence' к существующему типу
        BEGIN
            ALTER TYPE question_type_enum ADD VALUE IF NOT EXISTS 'sequence';
        EXCEPTION
            WHEN duplicate_object THEN
                -- Значение уже существует, игнорируем ошибку
                NULL;
        END;
    ELSIF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
        -- Создаем новый тип question_type
        CREATE TYPE question_type AS ENUM ('single_choice', 'multiple_choice', 'text', 'sequence');
    ELSE
        -- Добавляем значение 'sequence' к существующему типу question_type
        BEGIN
            ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'sequence';
        EXCEPTION
            WHEN duplicate_object THEN
                -- Значение уже существует, игнорируем ошибку
                NULL;
        END;
    END IF;
END $$;

-- Обновляем тип колонки question_type в таблице test_questions
-- Используем существующий тип question_type_enum если он есть
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type_enum') THEN
        -- Переименовываем тип для удобства
        ALTER TYPE question_type_enum RENAME TO question_type;
    END IF;
END $$;

-- Добавить поле correct_order в test_questions
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS correct_order integer[];

-- Добавить поле user_order в user_test_answers
ALTER TABLE user_test_answers ADD COLUMN IF NOT EXISTS user_order integer[];

-- Создание таблицы для вариантов последовательности
CREATE TABLE IF NOT EXISTS test_sequence_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid REFERENCES test_questions(id) ON DELETE CASCADE,
    answer_order integer NOT NULL,
    answer_text text NOT NULL
);

-- =====================================================
-- 4. СОЗДАНИЕ ФУНКЦИЙ ДЛЯ СТАТИСТИКИ
-- =====================================================

-- Функция для получения статистики оценок по мероприятию
CREATE OR REPLACE FUNCTION get_tp_evaluation_stats(p_event_id uuid)
RETURNS TABLE (
  total_participants bigint,
  evaluated_participants bigint,
  average_leadership_potential text,
  average_business_communication text,
  average_learning_ability text,
  average_motivation_level text,
  average_skills_score decimal,
  high_performers bigint,
  medium_performers bigint,
  low_performers bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH evaluation_stats AS (
    SELECT 
      COUNT(*) as total_evaluations,
      AVG(CASE 
        WHEN leadership_potential = 'high' THEN 3
        WHEN leadership_potential = 'medium' THEN 2
        ELSE 1
      END) as avg_leadership,
      AVG(CASE 
        WHEN business_communication = 'high' THEN 3
        WHEN business_communication = 'medium' THEN 2
        ELSE 1
      END) as avg_communication,
      AVG(CASE 
        WHEN learning_ability = 'high' THEN 3
        WHEN learning_ability = 'medium' THEN 2
        ELSE 1
      END) as avg_learning,
      AVG(CASE 
        WHEN motivation_level = 'high' THEN 3
        WHEN motivation_level = 'medium' THEN 2
        ELSE 1
      END) as avg_motivation,
      AVG(average_skills_score) as avg_skills,
      COUNT(CASE WHEN average_skills_score > 4.0 THEN 1 END) as high_count,
      COUNT(CASE WHEN average_skills_score >= 3.0 AND average_skills_score <= 4.0 THEN 1 END) as medium_count,
      COUNT(CASE WHEN average_skills_score < 3.0 THEN 1 END) as low_count
    FROM tp_evaluations
    WHERE event_id = p_event_id
  ),
  participant_count AS (
    SELECT COUNT(*) as total_participants
    FROM event_participants
    WHERE event_id = p_event_id
  )
  SELECT 
    pc.total_participants,
    es.total_evaluations,
    CASE 
      WHEN es.avg_leadership >= 2.5 THEN 'high'
      WHEN es.avg_leadership >= 1.5 THEN 'medium'
      ELSE 'low'
    END::text,
    CASE 
      WHEN es.avg_communication >= 2.5 THEN 'high'
      WHEN es.avg_communication >= 1.5 THEN 'medium'
      ELSE 'low'
    END::text,
    CASE 
      WHEN es.avg_learning >= 2.5 THEN 'high'
      WHEN es.avg_learning >= 1.5 THEN 'medium'
      ELSE 'low'
    END::text,
    CASE 
      WHEN es.avg_motivation >= 2.5 THEN 'high'
      WHEN es.avg_motivation >= 1.5 THEN 'medium'
      ELSE 'low'
    END::text,
    es.avg_skills,
    es.high_count,
    es.medium_count,
    es.low_count
  FROM evaluation_stats es, participant_count pc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИЙ
-- =====================================================
-- Все основные таблицы и функции созданы
-- Система готова к полноценной работе
