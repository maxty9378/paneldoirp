-- Проверка структуры таблицы user_test_answers
-- Запустите этот скрипт в Supabase SQL Editor

SELECT 
    'user_test_answers Structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'user_test_answers'
ORDER BY ordinal_position;
