-- Скрипт для ручного назначения тестов АКБ участнику
-- Замените 'USER_ID' и 'EVENT_ID' на реальные ID

-- 1. Найдем участника и мероприятие
SELECT 
    ep.id as participant_id,
    ep.user_id,
    u.full_name,
    ep.event_id,
    e.title as event_title,
    ep.attended
FROM event_participants ep
JOIN users u ON ep.user_id = u.id
JOIN events e ON ep.event_id = e.id
WHERE e.title ILIKE '%Управление территорией для развития АКБ%'
AND u.full_name ILIKE '%Темнов%';

-- 2. Найдем тесты АКБ
SELECT 
    t.id,
    t.title,
    t.type,
    t.status
FROM tests t
WHERE t.title ILIKE '%Управление территорией для развития АКБ%'
AND t.status = 'active'
ORDER BY t.type;

-- 3. Назначим тесты участнику (замените USER_ID и EVENT_ID на реальные значения)
-- Входной тест
INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
SELECT 
    ep.user_id,
    t.id,
    ep.event_id,
    'in_progress',
    NOW()
FROM event_participants ep
JOIN events e ON ep.event_id = e.id
JOIN tests t ON t.title ILIKE '%Управление территорией для развития АКБ%' AND t.type = 'entry' AND t.status = 'active'
WHERE e.title ILIKE '%Управление территорией для развития АКБ%'
AND ep.user_id IN (
    SELECT u.id FROM users u WHERE u.full_name ILIKE '%Темнов%'
)
ON CONFLICT (user_id, test_id, event_id) DO NOTHING;

-- Итоговый тест
INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
SELECT 
    ep.user_id,
    t.id,
    ep.event_id,
    'pending',
    NOW()
FROM event_participants ep
JOIN events e ON ep.event_id = e.id
JOIN tests t ON t.title ILIKE '%Управление территорией для развития АКБ%' AND t.type = 'final' AND t.status = 'active'
WHERE e.title ILIKE '%Управление территорией для развития АКБ%'
AND ep.user_id IN (
    SELECT u.id FROM users u WHERE u.full_name ILIKE '%Темнов%'
)
ON CONFLICT (user_id, test_id, event_id) DO NOTHING;

-- Годовой тест
INSERT INTO user_test_attempts (user_id, test_id, event_id, status, start_time)
SELECT 
    ep.user_id,
    t.id,
    ep.event_id,
    'pending',
    NOW()
FROM event_participants ep
JOIN events e ON ep.event_id = e.id
JOIN tests t ON t.title ILIKE '%Управление территорией для развития АКБ%' AND t.type = 'annual' AND t.status = 'active'
WHERE e.title ILIKE '%Управление территорией для развития АКБ%'
AND ep.user_id IN (
    SELECT u.id FROM users u WHERE u.full_name ILIKE '%Темнов%'
)
ON CONFLICT (user_id, test_id, event_id) DO NOTHING;

-- 4. Проверим результат
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
    uta.start_time
FROM user_test_attempts uta
JOIN users u ON uta.user_id = u.id
JOIN tests t ON uta.test_id = t.id
JOIN events e ON uta.event_id = e.id
WHERE u.full_name ILIKE '%Темнов%'
AND e.title ILIKE '%Управление территорией для развития АКБ%'
ORDER BY t.type;
