-- =====================================================
-- ДОПОЛНИТЕЛЬНЫЕ МИГРАЦИИ ДЛЯ ВОССТАНОВЛЕНИЯ БД
-- =====================================================
-- Выполните эти миграции через Supabase Dashboard → SQL Editor
-- в указанном порядке

-- =====================================================
-- 1. СОЗДАНИЕ ТАБЛИЦЫ ОЦЕНОК ТП
-- =====================================================
-- Создание таблицы для оценок торговых представителей
CREATE TABLE IF NOT EXISTS tp_evaluations (
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
  
  -- Автоматически вычисляемая средняя оценка
  average_skills_score decimal(3,2) NOT NULL,
  
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

-- =====================================================
-- 2. СОЗДАНИЕ ТАБЛИЦЫ QR ТОКЕНОВ
-- =====================================================
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

-- =====================================================
-- 3. СОЗДАНИЕ ТАБЛИЦЫ ТЕРРИТОРИЙ ТРЕНЕРОВ
-- =====================================================
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

-- =====================================================
-- 4. ДОБАВЛЕНИЕ ПОДДЕРЖКИ ПОСЛЕДОВАТЕЛЬНЫХ ВОПРОСОВ
-- =====================================================
-- Добавить значение 'sequence' в ENUM question_type (если уже есть ENUM)
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'sequence';

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
-- 5. ДОБАВЛЕНИЕ СТАТУСА ПРОВЕРКИ ТЕСТОВ
-- =====================================================
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

-- =====================================================
-- 6. ДОБАВЛЕНИЕ НОВЫХ НАВЫКОВ ПРОДАЖ
-- =====================================================
-- Добавляем новые колонки для навыков продаж в таблицу tp_evaluations
ALTER TABLE tp_evaluations 
ADD COLUMN IF NOT EXISTS bonus_calculation integer CHECK (bonus_calculation BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS tools_usage integer CHECK (tools_usage BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS task_execution integer CHECK (task_execution BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS weekly_planning integer CHECK (weekly_planning BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS client_connection_skill integer CHECK (client_connection_skill BETWEEN 1 AND 5);

-- Устанавливаем значения по умолчанию для существующих записей
UPDATE tp_evaluations 
SET 
  bonus_calculation = COALESCE(bonus_calculation, 1),
  tools_usage = COALESCE(tools_usage, 1),
  task_execution = COALESCE(task_execution, 1),
  weekly_planning = COALESCE(weekly_planning, 1),
  client_connection_skill = COALESCE(client_connection_skill, 1);

-- Делаем колонки обязательными
ALTER TABLE tp_evaluations 
ALTER COLUMN bonus_calculation SET NOT NULL,
ALTER COLUMN tools_usage SET NOT NULL,
ALTER COLUMN task_execution SET NOT NULL,
ALTER COLUMN weekly_planning SET NOT NULL,
ALTER COLUMN client_connection_skill SET NOT NULL;

-- =====================================================
-- 7. СОЗДАНИЕ ФУНКЦИЙ ДЛЯ СТАТИСТИКИ
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
