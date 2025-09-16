-- Добавление тестовых данных досье для участников
-- Это поможет проверить отображение карточек резервистов

-- Сначала создаем простые тестовые данные без сложных колонок
DO $$
DECLARE
  test_user_id UUID;
  test_event_id UUID;
BEGIN
  -- Получаем первого пользователя
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  -- Получаем первое событие типа exam
  SELECT id INTO test_event_id FROM events WHERE event_type = 'exam' LIMIT 1;
  
  -- Если нет пользователя или события, создаем базовые данные
  IF test_user_id IS NULL THEN
    INSERT INTO users (full_name, email, sap_number) 
    VALUES ('Иванов Иван Иванович', 'test@example.com', 'TEST001')
    RETURNING id INTO test_user_id;
  END IF;
  
  IF test_event_id IS NULL THEN
    INSERT INTO events (title, description, event_type, start_date, end_date, status) 
    VALUES (
      'Тестовый экзамен', 
      'Тестовое событие для проверки карточек', 
      'exam', 
      NOW(), 
      NOW() + INTERVAL '1 day', 
      'published'
    )
    RETURNING id INTO test_event_id;
  END IF;
END $$;

-- Вставляем тестовые досье для пользователей с фейковыми фотографиями
INSERT INTO participant_dossiers (
  user_id,
  event_id,
  photo_url
) 
SELECT 
  u.id as user_id,
  e.id as event_id,
  'https://images.unsplash.com/photo-1534528228-8e5f80e31e2e?w=300&h=400&fit=crop&crop=face' as photo_url
FROM users u
CROSS JOIN events e
WHERE u.id IS NOT NULL 
  AND e.event_type = 'exam'
  AND NOT EXISTS (
    SELECT 1 FROM participant_dossiers pd 
    WHERE pd.user_id = u.id AND pd.event_id = e.id
  )
LIMIT 5
ON CONFLICT (user_id, event_id) DO UPDATE SET
  photo_url = EXCLUDED.photo_url,
  updated_at = NOW();

-- Если таблица поддерживает дополнительные колонки, обновляем их
UPDATE participant_dossiers SET 
  position = 'Супервайзер СНС',
  territory = 'СНС – Зеленоград',
  age = 35,
  experience_in_position = 'От 1 до 3 лет'
WHERE position IS NULL;
