-- Добавление поля current_question_index в таблицу user_test_attempts
ALTER TABLE user_test_attempts ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0;
