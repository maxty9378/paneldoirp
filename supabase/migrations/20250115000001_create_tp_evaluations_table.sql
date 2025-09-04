-- Создание таблицы для оценок ТП
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
-- Тренеры могут создавать и обновлять оценки для участников своих мероприятий
CREATE POLICY "Trainers can manage evaluations for their events" ON tp_evaluations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = tp_evaluations.event_id
      AND e.creator_id = auth.uid()
    )
  );

-- Администраторы и модераторы могут видеть все оценки
CREATE POLICY "Admins can view all evaluations" ON tp_evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('administrator', 'moderator')
    )
  );

-- Участники могут видеть только свои оценки
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
    FROM event_participants_view
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
