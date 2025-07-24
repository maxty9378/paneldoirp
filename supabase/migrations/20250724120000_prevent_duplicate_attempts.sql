-- Создание уникального индекса для предотвращения повторных попыток теста
-- Удаление существующего индекса, если он есть
DROP INDEX IF EXISTS idx_user_test_attempts_unique;

-- Создание нового уникального индекса с дополнительными фильтрами
CREATE UNIQUE INDEX idx_user_test_attempts_unique 
ON user_test_attempts (user_id, test_id, event_id)
WHERE status = 'completed';

-- Добавление триггера для предотвращения дублирования
CREATE OR REPLACE FUNCTION prevent_duplicate_test_attempts()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверка на существование завершенной попытки
    IF EXISTS (
        SELECT 1 
        FROM user_test_attempts 
        WHERE user_id = NEW.user_id 
          AND test_id = NEW.test_id 
          AND event_id = NEW.event_id 
          AND status = 'completed'
    ) THEN
        RAISE EXCEPTION 'Тест уже пройден для данного пользователя, теста и мероприятия';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER check_duplicate_test_attempts
BEFORE INSERT OR UPDATE ON user_test_attempts
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_test_attempts(); 