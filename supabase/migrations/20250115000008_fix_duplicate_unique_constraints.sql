-- Удаление дублирующегося уникального индекса
-- У нас есть два одинаковых уникальных индекса на (event_id, user_id)
-- Оставляем только один: event_participants_event_user_key

-- Удаляем старый дублирующийся индекс
DROP INDEX IF EXISTS event_participants_event_id_user_id_key;

-- Проверяем, что остался только один уникальный индекс
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints 
    WHERE table_name = 'event_participants'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%event%user%';
    
    IF constraint_count = 1 THEN
        RAISE NOTICE '✅ Успешно: остался только один уникальный индекс на (event_id, user_id)';
    ELSE
        RAISE WARNING '⚠️ Проблема: найдено % уникальных индексов на (event_id, user_id)', constraint_count;
    END IF;
END $$;
