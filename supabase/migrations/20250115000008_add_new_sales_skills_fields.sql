-- Добавление новых полей навыков продаж в таблицу tp_evaluations
-- Добавляем новые поля, не удаляя старые для совместимости

-- Добавляем новые колонки
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

-- Обновляем функцию расчета средней оценки для новых полей
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
