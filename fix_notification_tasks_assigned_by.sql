-- Исправление колонки assigned_by в таблице notification_tasks

-- 1. Делаем колонку assigned_by nullable, если она NOT NULL
ALTER TABLE public.notification_tasks 
ALTER COLUMN assigned_by DROP NOT NULL;

-- 2. Устанавливаем дефолтное значение для assigned_by (текущий пользователь)
ALTER TABLE public.notification_tasks 
ALTER COLUMN assigned_by SET DEFAULT auth.uid();

-- 3. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';

-- 4. Проверяем результат
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notification_tasks' 
AND column_name = 'assigned_by';
