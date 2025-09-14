-- Проверка структуры таблицы events
-- Запустите этот скрипт в Supabase SQL Editor

SELECT 
    'Events Table Columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'events'
ORDER BY ordinal_position;
