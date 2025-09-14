-- Добавляем статус 'pending_review' в таблицу user_test_attempts
ALTER TABLE user_test_attempts 
DROP CONSTRAINT IF EXISTS user_test_attempts_status_check;

ALTER TABLE user_test_attempts 
ADD CONSTRAINT user_test_attempts_status_check 
CHECK (status IN ('in_progress', 'completed', 'failed', 'pending_review'));
