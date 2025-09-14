-- Удаление дублирующегося уникального ограничения
-- У нас есть два одинаковых уникальных ограничения на (event_id, user_id)
-- Оставляем только одно: event_participants_event_user_key

-- Удаляем старое дублирующееся ограничение
ALTER TABLE event_participants DROP CONSTRAINT IF EXISTS event_participants_event_id_user_id_key;

-- Проверяем, что остался только один уникальный индекс
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'event_participants'
AND indexname LIKE '%event%user%'
ORDER BY indexname;
