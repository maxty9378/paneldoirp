-- Добавляем поле для сохранения текущей позиции вопроса в попытке теста
ALTER TABLE user_test_attempts 
ADD COLUMN current_question_index INTEGER DEFAULT 0;

-- Добавляем комментарий к полю
COMMENT ON COLUMN user_test_attempts.current_question_index IS 'Индекс текущего вопроса (0-based)';

-- Обновляем существующие записи
UPDATE user_test_attempts 
SET current_question_index = 0 
WHERE current_question_index IS NULL;
