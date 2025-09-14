-- =====================================================
-- ИСПРАВЛЕНИЕ ОТСУТСТВУЮЩЕЙ КОЛОНКИ passed
-- =====================================================
-- Добавляем колонку passed в таблицу user_test_attempts
-- если она отсутствует

-- Проверяем существование колонки passed
DO $$
BEGIN
    -- Проверяем, существует ли колонка passed
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'user_test_attempts' 
            AND column_name = 'passed'
    ) THEN
        -- Добавляем колонку passed
        ALTER TABLE user_test_attempts 
        ADD COLUMN passed BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Колонка passed добавлена в таблицу user_test_attempts';
        
        -- Обновляем существующие записи на основе score и passing_score
        UPDATE user_test_attempts 
        SET passed = (
            score >= (
                SELECT t.passing_score 
                FROM tests t 
                WHERE t.id = user_test_attempts.test_id
            )
        )
        WHERE score IS NOT NULL;
        
        RAISE NOTICE 'Существующие записи обновлены на основе баллов';
    ELSE
        RAISE NOTICE 'Колонка passed уже существует в таблице user_test_attempts';
    END IF;
END $$;

-- Проверяем финальную структуру таблицы
SELECT 
    'user_test_attempts Final Structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'user_test_attempts'
    AND column_name IN ('passed', 'reviewed_at', 'reviewed_by', 'review_notes', 'review_score')
ORDER BY ordinal_position;
