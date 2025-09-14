-- Исправление типа колонки priority в таблице notification_tasks (версия 3)

-- 1. Сначала удаляем дефолтное значение
ALTER TABLE public.notification_tasks 
ALTER COLUMN priority DROP DEFAULT;

-- 2. Конвертируем text в integer
ALTER TABLE public.notification_tasks 
ALTER COLUMN priority TYPE integer USING 
  CASE 
    WHEN priority = 'low' THEN 1
    WHEN priority = 'medium' THEN 2
    WHEN priority = 'high' THEN 3
    WHEN priority = 'urgent' THEN 4
    ELSE 2  -- по умолчанию medium
  END;

-- 3. Устанавливаем новое дефолтное значение
ALTER TABLE public.notification_tasks 
ALTER COLUMN priority SET DEFAULT 2;

-- 4. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';
