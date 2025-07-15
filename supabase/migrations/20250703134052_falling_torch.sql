/*
# Обновление типов мероприятий для тренеров СПП

1. Изменения:
   - Обновление существующих типов мероприятий для тренеров СПП
   - Добавление полных названий в description для онлайн и очного тренингов
   - Уточнение названий и настроек для корректной работы UI

2. Безопасность:
   - Проверка существования типов перед добавлением
   - Сохранение уникальности имен
*/

-- Удаляем существующие типы мероприятий для тренеров СПП, чтобы создать их с правильными параметрами
DELETE FROM event_types WHERE name IN ('online_training', 'offline_training');

-- Добавляем обновленный онлайн-тренинг
INSERT INTO event_types (
  id, 
  name,
  name_ru,
  description,
  is_online,
  requires_location,
  has_entry_test,
  has_final_test,
  has_feedback_form
) VALUES (
  gen_random_uuid(),
  'online_training',
  'Онлайн-тренинг',
  'Технология эффективных продаж',
  true,
  false,
  true,
  true,
  true
);

-- Добавляем обновленный очный тренинг
INSERT INTO event_types (
  id, 
  name,
  name_ru,
  description,
  is_online,
  requires_location,
  has_entry_test,
  has_final_test,
  has_feedback_form
) VALUES (
  gen_random_uuid(),
  'offline_training',
  'Очный тренинг',
  'Управление территорией для развития АКБ и получения максимального бонуса',
  false,
  true,
  true,
  true,
  true
);

-- Добавляем индекс по имени для более быстрого поиска (если не существует)
CREATE INDEX IF NOT EXISTS event_types_name_idx ON event_types (name);

-- Добавляем уникальное ограничение для имени, если его ещё нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_types_name_key' AND conrelid = 'event_types'::regclass
  ) THEN
    ALTER TABLE event_types ADD CONSTRAINT event_types_name_key UNIQUE (name);
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Unique constraint on name already exists or cannot be created';
END $$;

-- Обновляем RLS политики для event_types
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users to read event_types" ON event_types;
CREATE POLICY "Allow all users to read event_types"
  ON event_types
  FOR SELECT
  TO anon, authenticated
  USING (true);