-- Добавление колонки metadata в таблицу notification_tasks

-- Добавляем колонку metadata, если её нет
ALTER TABLE public.notification_tasks
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';
