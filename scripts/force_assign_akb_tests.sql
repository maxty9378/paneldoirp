-- Принудительное назначение тестов АКБ всем участникам мероприятия
-- Этот скрипт назначит тесты всем участникам, независимо от статуса attended

-- 1. Сначала найдем все нужные ID
WITH event_data AS (
  SELECT 
    e.id as event_id,
    e.title as event_title,
    e.event_type_id
  FROM events e
  WHERE e.title ILIKE '%Управление территорией для развития АКБ%'
  ORDER BY e.created_at DESC
  LIMIT 1
),
test_data AS (
  SELECT 
    t.id as entry_test_id,
    t2.id as final_test_id,
    t3.id as annual_test_id
  FROM event_data ed
  CROSS JOIN LATERAL (
    SELECT t.id
    FROM tests t
    WHERE t.event_type_id = ed.event_type_id
      AND t.title ILIKE '%Управление территорией для развития АКБ%'
      AND t.type = 'entry'
      AND t.status = 'active'
    ORDER BY t.created_at DESC
    LIMIT 1
  ) t
  CROSS JOIN LATERAL (
    SELECT t2.id
    FROM tests t2
    WHERE t2.event_type_id = ed.event_type_id
      AND t2.title ILIKE '%Управление территорией для развития АКБ%'
      AND t2.type = 'final'
      AND t2.status = 'active'
    ORDER BY t2.created_at DESC
    LIMIT 1
  ) t2
  CROSS JOIN LATERAL (
    SELECT t3.id
    FROM tests t3
    WHERE t3.event_type_id = ed.event_type_id
      AND t3.title ILIKE '%Управление территорией для развития АКБ%'
      AND t3.type = 'annual'
      AND t3.status = 'active'
    ORDER BY t3.created_at DESC
    LIMIT 1
  ) t3
)
-- 2. Назначим тесты всем участникам мероприятия
INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
SELECT 
    ep.user_id,
    td.entry_test_id,
    ed.event_id,
    'in_progress',
    NOW()
FROM event_data ed
CROSS JOIN test_data td
JOIN event_participants ep ON ep.event_id = ed.event_id
WHERE td.entry_test_id IS NOT NULL
ON CONFLICT (user_id, test_id, event_id) DO NOTHING;

-- 3. Назначим итоговый тест
INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
SELECT 
    ep.user_id,
    td.final_test_id,
    ed.event_id,
    'pending',
    NOW()
FROM event_data ed
CROSS JOIN test_data td
JOIN event_participants ep ON ep.event_id = ed.event_id
WHERE td.final_test_id IS NOT NULL
ON CONFLICT (user_id, test_id, event_id) DO NOTHING;

-- 4. Назначим годовой тест
INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
SELECT 
    ep.user_id,
    td.annual_test_id,
    ed.event_id,
    'pending',
    NOW()
FROM event_data ed
CROSS JOIN test_data td
JOIN event_participants ep ON ep.event_id = ed.event_id
WHERE td.annual_test_id IS NOT NULL
ON CONFLICT (user_id, test_id, event_id) DO NOTHING;

-- 5. Проверим результат
SELECT 
    uta.id,
    uta.user_id,
    u.full_name,
    uta.test_id,
    t.title as test_title,
    t.type as test_type,
    uta.event_id,
    e.title as event_title,
    uta.status,
    uta.start_time,
    ep.attended
FROM user_test_attempts uta
JOIN users u ON uta.user_id = u.id
JOIN tests t ON uta.test_id = t.id
JOIN events e ON uta.event_id = e.id
JOIN event_participants ep ON ep.user_id = uta.user_id AND ep.event_id = uta.event_id
WHERE e.title ILIKE '%Управление территорией для развития АКБ%'
ORDER BY u.full_name, t.type;
