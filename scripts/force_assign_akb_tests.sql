-- Принудительное назначение тестов АКБ всем участникам мероприятия
-- Этот скрипт назначит тесты всем участникам, независимо от статуса attended

-- 1. Найдем мероприятие АКБ
DO $$
DECLARE
  event_id UUID;
  entry_test_id UUID;
  final_test_id UUID;
  annual_test_id UUID;
BEGIN
  -- Получаем ID мероприятия
  SELECT e.id INTO event_id
  FROM events e
  WHERE e.title ILIKE '%Управление территорией для развития АКБ%'
  ORDER BY e.created_at DESC
  LIMIT 1;
  
  IF event_id IS NULL THEN
    RAISE EXCEPTION 'Мероприятие "Управление территорией для развития АКБ" не найдено';
  END IF;

  -- Получаем ID тестов
  SELECT t.id INTO entry_test_id
  FROM tests t
  WHERE t.title ILIKE '%Управление территорией для развития АКБ%'
    AND t.type = 'entry'
    AND t.status = 'active'
  ORDER BY t.created_at DESC
  LIMIT 1;

  SELECT t.id INTO final_test_id
  FROM tests t
  WHERE t.title ILIKE '%Управление территорией для развития АКБ%'
    AND t.type = 'final'
    AND t.status = 'active'
  ORDER BY t.created_at DESC
  LIMIT 1;

  SELECT t.id INTO annual_test_id
  FROM tests t
  WHERE t.title ILIKE '%Управление территорией для развития АКБ%'
    AND t.type = 'annual'
    AND t.status = 'active'
  ORDER BY t.created_at DESC
  LIMIT 1;

  -- 2. Назначим входной тест
  IF entry_test_id IS NOT NULL THEN
    INSERT INTO user_test_attempts (user_id, test_id, started_at)
    SELECT 
        ep.user_id,
        entry_test_id,
        now()
    FROM event_participants ep
    WHERE ep.event_id = event_id
    AND NOT EXISTS (
        SELECT 1 FROM user_test_attempts uta2 
        WHERE uta2.user_id = ep.user_id AND uta2.test_id = entry_test_id
    );
    RAISE NOTICE 'Назначен входной тест % участникам', entry_test_id;
  END IF;

  -- 3. Назначим итоговый тест
  IF final_test_id IS NOT NULL THEN
    INSERT INTO user_test_attempts (user_id, test_id, started_at)
    SELECT 
        ep.user_id,
        final_test_id,
        now()
    FROM event_participants ep
    WHERE ep.event_id = event_id
    AND NOT EXISTS (
        SELECT 1 FROM user_test_attempts uta2 
        WHERE uta2.user_id = ep.user_id AND uta2.test_id = final_test_id
    );
    RAISE NOTICE 'Назначен итоговый тест % участникам', final_test_id;
  END IF;

  -- 4. Назначим годовой тест
  IF annual_test_id IS NOT NULL THEN
    INSERT INTO user_test_attempts (user_id, test_id, started_at)
    SELECT 
        ep.user_id,
        annual_test_id,
        now()
    FROM event_participants ep
    WHERE ep.event_id = event_id
    AND NOT EXISTS (
        SELECT 1 FROM user_test_attempts uta2 
        WHERE uta2.user_id = ep.user_id AND uta2.test_id = annual_test_id
    );
    RAISE NOTICE 'Назначен годовой тест % участникам', annual_test_id;
  END IF;

  RAISE NOTICE 'Назначение тестов завершено для мероприятия %', event_id;
END $$;

-- 5. Проверим результат
SELECT 
    uta.id,
    uta.user_id,
    u.full_name,
    uta.test_id,
    t.title as test_title,
    t.type as test_type,
    uta.started_at,
    uta.completed_at
FROM user_test_attempts uta
JOIN users u ON uta.user_id = u.id
JOIN tests t ON uta.test_id = t.id
WHERE t.title ILIKE '%Управление территорией для развития АКБ%'
ORDER BY u.full_name, t.type;



