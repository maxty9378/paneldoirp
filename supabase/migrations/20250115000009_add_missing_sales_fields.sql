-- Добавление недостающих полей навыков продаж
-- Добавляем только новые поля, не трогая старые

ALTER TABLE tp_evaluations 
ADD COLUMN IF NOT EXISTS bonus_calculation integer DEFAULT 1 CHECK (bonus_calculation BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS tools_usage integer DEFAULT 1 CHECK (tools_usage BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS task_execution integer DEFAULT 1 CHECK (task_execution BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS weekly_planning integer DEFAULT 1 CHECK (weekly_planning BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS client_connection_skill integer DEFAULT 1 CHECK (client_connection_skill BETWEEN 1 AND 5);

-- Обновляем существующие записи
UPDATE tp_evaluations 
SET 
  bonus_calculation = 1,
  tools_usage = 1,
  task_execution = 1,
  weekly_planning = 1,
  client_connection_skill = 1
WHERE bonus_calculation IS NULL;

-- Делаем поля обязательными
ALTER TABLE tp_evaluations 
ALTER COLUMN bonus_calculation SET NOT NULL,
ALTER COLUMN tools_usage SET NOT NULL,
ALTER COLUMN task_execution SET NOT NULL,
ALTER COLUMN weekly_planning SET NOT NULL,
ALTER COLUMN client_connection_skill SET NOT NULL;
