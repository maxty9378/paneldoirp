-- Добавление колонки metadata в таблицу notification_tasks

-- Добавляем колонку metadata, если её нет
ALTER TABLE public.notification_tasks
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';

-- Проверяем структуру таблицы
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notification_tasks' 
ORDER BY ordinal_position;
