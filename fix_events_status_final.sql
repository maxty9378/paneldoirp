-- Финальное исправление типа колонки status в таблице events

-- 1. Сначала удаляем представление, которое зависит от колонки status
DROP VIEW IF EXISTS public.event_participants_view;

-- 2. Конвертируем enum в text
ALTER TABLE public.events 
ALTER COLUMN status TYPE text USING status::text;

-- 3. Устанавливаем дефолтное значение
ALTER TABLE public.events 
ALTER COLUMN status SET DEFAULT 'draft';

-- 4. Пересоздаем представление (если оно нужно)
-- Пока оставляем без представления, чтобы избежать проблем

-- 5. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';

-- 6. Проверяем результат
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events' 
AND column_name = 'status';
