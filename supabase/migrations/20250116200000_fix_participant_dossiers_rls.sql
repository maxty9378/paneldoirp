-- Исправление RLS для таблицы participant_dossiers
-- Эта таблица была создана после основного исправления RLS

-- 1. Отключаем RLS для participant_dossiers
ALTER TABLE participant_dossiers DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем все политики RLS для participant_dossiers
DROP POLICY IF EXISTS "Users can view dossiers for events they have access to" ON participant_dossiers;
DROP POLICY IF EXISTS "Users can insert dossiers for events they have access to" ON participant_dossiers;
DROP POLICY IF EXISTS "Users can update dossiers for events they have access to" ON participant_dossiers;
DROP POLICY IF EXISTS "Users can delete dossiers for events they have access to" ON participant_dossiers;

-- 3. Добавляем комментарий
COMMENT ON TABLE participant_dossiers IS 'RLS отключен для обеспечения работоспособности приложения';
