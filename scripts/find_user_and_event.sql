-- Найдем пользователя и мероприятие для назначения тестов

-- 1. Найдем пользователя Темнов Георгий
SELECT 
    id,
    full_name,
    email,
    role,
    is_active
FROM users 
WHERE full_name ILIKE '%Темнов%';

-- 2. Найдем мероприятие "Управление территорией для развития АКБ"
SELECT 
    id,
    title,
    description,
    event_type_id,
    status,
    start_date,
    end_date
FROM events 
WHERE title ILIKE '%Управление территорией для развития АКБ%'
ORDER BY created_at DESC;

-- 3. Найдем участников этого мероприятия
SELECT 
    ep.id as participant_id,
    ep.user_id,
    u.full_name,
    ep.event_id,
    e.title as event_title,
    ep.attended,
    ep.created_at
FROM event_participants ep
JOIN users u ON ep.user_id = u.id
JOIN events e ON ep.event_id = e.id
WHERE e.title ILIKE '%Управление территорией для развития АКБ%'
ORDER BY ep.created_at DESC;

-- 4. Найдем тесты АКБ
SELECT 
    t.id,
    t.title,
    t.type,
    t.status,
    t.passing_score,
    t.time_limit
FROM tests t
WHERE t.title ILIKE '%Управление территорией для развития АКБ%'
ORDER BY t.type, t.created_at DESC;















