-- =====================================================
-- ИСПРАВЛЕНИЕ ОТСУТСТВУЮЩЕЙ КОЛОНКИ text_answer
-- =====================================================
-- Добавляем колонку text_answer в таблицу user_test_answers
-- если она отсутствует

-- Проверяем существование колонки text_answer
DO $$
BEGIN
    -- Проверяем, существует ли колонка text_answer
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'user_test_answers' 
            AND column_name = 'text_answer'
    ) THEN
        -- Добавляем колонку text_answer
        ALTER TABLE user_test_answers 
        ADD COLUMN text_answer TEXT;
        
        RAISE NOTICE 'Колонка text_answer добавлена в таблицу user_test_answers';
    ELSE
        RAISE NOTICE 'Колонка text_answer уже существует в таблице user_test_answers';
    END IF;
END $$;

-- Проверяем, есть ли колонка answer_text (может быть дубликатом)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'user_test_answers' 
            AND column_name = 'answer_text'
    ) THEN
        RAISE NOTICE 'Найдена колонка answer_text - возможно, это дубликат text_answer';
        
        -- Если есть данные в answer_text, но нет в text_answer, копируем их
        UPDATE user_test_answers 
        SET text_answer = answer_text 
        WHERE text_answer IS NULL AND answer_text IS NOT NULL;
        
        RAISE NOTICE 'Данные из answer_text скопированы в text_answer';
    END IF;
END $$;

-- Проверяем финальную структуру таблицы
SELECT 
    'user_test_answers Final Structure' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'user_test_answers'
ORDER BY ordinal_position;
