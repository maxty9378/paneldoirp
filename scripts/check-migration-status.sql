-- Проверяем статус миграции
SELECT 
    'Tables check:' as check_type,
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_name IN ('tests', 'test_questions', 'test_answers', 'user_test_attempts', 'user_test_answers', 'test_sequence_answers')
ORDER BY table_name;

-- Проверяем поле current_question_index
SELECT 
    'Column check:' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_test_attempts' 
AND column_name = 'current_question_index';

-- Проверяем структуру user_test_attempts
SELECT 
    'Table structure:' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_test_attempts'
ORDER BY ordinal_position;

-- Проверяем RLS политики
SELECT 
    'RLS policies:' as check_type,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename IN ('user_test_attempts', 'user_test_answers')
ORDER BY tablename, policyname;
