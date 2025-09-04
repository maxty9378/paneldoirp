-- Проверяем, есть ли поле current_question_index в таблице user_test_attempts
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_test_attempts' 
AND column_name = 'current_question_index';

-- Если поле не существует, добавляем его
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'current_question_index'
    ) THEN
        ALTER TABLE user_test_attempts 
        ADD COLUMN current_question_index INTEGER DEFAULT 0;
        
        COMMENT ON COLUMN user_test_attempts.current_question_index IS 'Индекс текущего вопроса (0-based)';
        
        UPDATE user_test_attempts 
        SET current_question_index = 0 
        WHERE current_question_index IS NULL;
        
        RAISE NOTICE 'Поле current_question_index добавлено в таблицу user_test_attempts';
    ELSE
        RAISE NOTICE 'Поле current_question_index уже существует в таблице user_test_attempts';
    END IF;
END $$;
