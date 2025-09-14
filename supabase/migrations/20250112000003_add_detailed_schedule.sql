-- Добавляем поле detailed_schedule в таблицу events
ALTER TABLE events 
ADD COLUMN detailed_schedule JSONB DEFAULT '[]'::jsonb;

-- Добавляем комментарий к полю
COMMENT ON COLUMN events.detailed_schedule IS 'Детальное расписание экзамена в формате JSON с временными блоками';

-- Создаем индекс для быстрого поиска по расписанию
CREATE INDEX idx_events_detailed_schedule ON events USING GIN (detailed_schedule);
