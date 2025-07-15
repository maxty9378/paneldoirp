-- Добавить значение 'sequence' в ENUM question_type (если уже есть ENUM)
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'sequence';

-- Добавить поле correct_order в test_questions
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS correct_order integer[];

-- Добавить поле user_order в user_test_answers
ALTER TABLE user_test_answers ADD COLUMN IF NOT EXISTS user_order integer[]; 