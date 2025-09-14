-- Исправление типа колонки status в таблице events с enum на text

-- Проверяем текущий тип колонки status
SELECT 
    column_name, 
    data_type, 
    udt_name,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events' 
AND column_name = 'status';

-- Конвертируем enum в text
ALTER TABLE public.events 
ALTER COLUMN status TYPE text USING status::text;

-- Устанавливаем дефолтное значение
ALTER TABLE public.events 
ALTER COLUMN status SET DEFAULT 'draft';

-- Проверяем результат
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events' 
AND column_name = 'status';
