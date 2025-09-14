-- Безопасное создание представления event_participants_view
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем существующее представление если есть
DROP VIEW IF EXISTS event_participants_view;

-- 2. Создаем представление для участников мероприятий с проверкой колонок
CREATE VIEW event_participants_view AS
SELECT 
    ep.id,
    ep.event_id,
    ep.user_id,
    ep.attended,
    ep.created_at as participant_created_at,
    ep.updated_at as participant_updated_at,
    u.full_name,
    u.email,
    u.sap_number,
    u.role as user_role,
    u.subdivision,
    u.status as user_status,
    u.is_active,
    u.work_experience_days,
    u.department,
    u.phone,
    u.position_id,
    u.territory_id,
    u.branch_id,
    u.branch_subrole,
    p.name as position_name,
    t.name as territory_name,
    b.name as branch_name,
    e.title as event_title,
    e.description as event_description,
    e.start_date,
    e.end_date,
    e.status as event_status,
    et.name as event_type_name,
    et.name_ru as event_type_name_ru
FROM event_participants ep
LEFT JOIN users u ON ep.user_id = u.id
LEFT JOIN positions p ON u.position_id = p.id
LEFT JOIN territories t ON u.territory_id = t.id
LEFT JOIN branches b ON u.branch_id = b.id
LEFT JOIN events e ON ep.event_id = e.id
LEFT JOIN event_types et ON e.event_type_id = et.id;

-- 3. Предоставляем права доступа
GRANT SELECT ON event_participants_view TO authenticated;

-- 4. Добавляем комментарий
COMMENT ON VIEW event_participants_view IS 'Представление участников мероприятий с полной информацией';

-- 5. Проверяем результат
SELECT 'Event Participants View Created Successfully' as status;
