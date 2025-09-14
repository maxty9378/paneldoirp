-- Исправление типа колонки priority в таблице notification_tasks (версия 4)

-- 1. Сначала удаляем дефолтное значение
ALTER TABLE public.notification_tasks 
ALTER COLUMN priority DROP DEFAULT;

-- 2. Конвертируем text в integer
ALTER TABLE public.notification_tasks 
ALTER COLUMN priority TYPE integer USING 
  CASE 
    WHEN priority::text = 'low' THEN 1
    WHEN priority::text = 'medium' THEN 2
    WHEN priority::text = 'high' THEN 3
    WHEN priority::text = 'urgent' THEN 4
    ELSE 2  -- по умолчанию medium
  END;

-- 3. Устанавливаем новое дефолтное значение
ALTER TABLE public.notification_tasks 
ALTER COLUMN priority SET DEFAULT 2;

-- 4. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';

-- 5. Проверяем результат
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notification_tasks' 
AND column_name = 'priority';
