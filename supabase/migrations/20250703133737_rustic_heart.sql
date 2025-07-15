/*
  # Добавление специальных типов мероприятий для тренеров СПП
  
  1. Новые типы мероприятий
    - Онлайн-тренинг (online_training) "Технология эффективных продаж"
    - Очный тренинг (offline_training) "Управление территорией для развития АКБ и получения максимального бонуса"

  2. Обеспечение уникальности технических имен
*/

-- Проверяем, существуют ли уже мероприятия с такими техническими именами
DO $$
DECLARE
  online_count integer;
  offline_count integer;
BEGIN
  SELECT COUNT(*) INTO online_count FROM event_types WHERE name = 'online_training';
  SELECT COUNT(*) INTO offline_count FROM event_types WHERE name = 'offline_training';

  -- Если онлайн-тренинг не существует, добавляем его
  IF online_count = 0 THEN
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
  END IF;

  -- Если очный тренинг не существует, добавляем его
  IF offline_count = 0 THEN
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
  END IF;
END $$;

-- Добавляем индекс по имени для более быстрого поиска
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