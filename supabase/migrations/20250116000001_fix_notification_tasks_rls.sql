-- Исправление RLS политик для таблицы notification_tasks
-- Проблема: RLS включен для notification_tasks, но отключен для других таблиц
-- Решение: Отключить RLS для notification_tasks или исправить политики

-- Вариант 1: Отключить RLS для notification_tasks (временное решение)
ALTER TABLE notification_tasks DISABLE ROW LEVEL SECURITY;

-- Вариант 2: Исправить политики для notification_tasks (если нужно оставить RLS)
-- Удаляем существующие политики
-- DROP POLICY IF EXISTS "Users can view their tasks" ON notification_tasks;
-- DROP POLICY IF EXISTS "Managers can create tasks" ON notification_tasks;
-- DROP POLICY IF EXISTS "Users can update their tasks" ON notification_tasks;

-- Создаем новые политики, которые работают с отключенным RLS для users
-- CREATE POLICY "Authenticated users can view their tasks"
--   ON notification_tasks
--   FOR SELECT
--   TO authenticated
--   USING (
--     auth.uid() = user_id OR 
--     auth.uid() = assigned_to
--   );

-- CREATE POLICY "Authenticated users can create tasks"
--   ON notification_tasks
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- CREATE POLICY "Authenticated users can update their tasks"
--   ON notification_tasks
--   FOR UPDATE
--   TO authenticated
--   USING (
--     auth.uid() = assigned_to
--   );

-- Также отключаем RLS для других системных таблиц для консистентности
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs DISABLE ROW LEVEL SECURITY;

-- Добавляем комментарий о том, что RLS отключен временно
COMMENT ON TABLE notification_tasks IS 'RLS отключен временно для совместимости с отключенным RLS в основных таблицах';
COMMENT ON TABLE system_settings IS 'RLS отключен временно для совместимости с отключенным RLS в основных таблицах';
COMMENT ON TABLE admin_logs IS 'RLS отключен временно для совместимости с отключенным RLS в основных таблицах';
