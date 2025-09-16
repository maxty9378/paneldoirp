-- Исправление структуры таблицы participant_dossiers
-- Добавление недостающих колонок если их нет

-- 1. Добавляем колонки если их нет
ALTER TABLE participant_dossiers 
ADD COLUMN IF NOT EXISTS territory TEXT;

ALTER TABLE participant_dossiers 
ADD COLUMN IF NOT EXISTS position TEXT;

ALTER TABLE participant_dossiers 
ADD COLUMN IF NOT EXISTS age INTEGER;

ALTER TABLE participant_dossiers 
ADD COLUMN IF NOT EXISTS experience_in_position TEXT;

ALTER TABLE participant_dossiers 
ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '{}';

ALTER TABLE participant_dossiers 
ADD COLUMN IF NOT EXISTS achievements TEXT[] DEFAULT '{}';

-- 2. Отключаем RLS
ALTER TABLE participant_dossiers DISABLE ROW LEVEL SECURITY;

-- 3. Удаляем все политики RLS
DROP POLICY IF EXISTS "Users can view dossiers for events they have access to" ON participant_dossiers;
DROP POLICY IF EXISTS "Users can insert dossiers for events they have access to" ON participant_dossiers;
DROP POLICY IF EXISTS "Users can update dossiers for events they have access to" ON participant_dossiers;
DROP POLICY IF EXISTS "Users can delete dossiers for events they have access to" ON participant_dossiers;
