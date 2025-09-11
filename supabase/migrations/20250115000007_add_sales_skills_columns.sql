-- Добавление новых колонок для навыков продаж в таблицу tp_evaluations
-- Заменяем старые поля на новые согласно обновленным критериям

-- Сначала добавляем новые колонки
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

-- Обновляем функцию расчета средней оценки
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

-- Обновляем существующие записи с правильной средней оценкой
UPDATE tp_evaluations 
SET average_skills_score = (
  bonus_calculation + 
  tools_usage + 
  task_execution + 
  weekly_planning + 
  new_client_connection + 
  client_connection_skill
) / 6.0;

-- Обновляем функцию статистики для новых полей
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
