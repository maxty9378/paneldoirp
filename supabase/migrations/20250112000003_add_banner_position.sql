-- Добавляем поле banner_position в таблицу events для сохранения позиции обложки
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS banner_position VARCHAR(50) DEFAULT 'center bottom';

-- Комментарий к полю
COMMENT ON COLUMN events.banner_position IS 'CSS background-position для обложки мероприятия (например: center bottom, 50% 100%)';

-- Обновляем существующие записи с дефолтным значением
UPDATE events 
SET banner_position = 'center bottom' 
WHERE banner_position IS NULL;
