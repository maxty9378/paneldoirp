-- Проверка номеров выступлений для экзамена 36520f72-c191-4e32-ba02-aa17c482c50b

SELECT 
    pa.presentation_number as "Номер выступления",
    u.full_name as "Имя участника",
    u.email as "Email",
    p.name as "Должность",
    t.name as "Территория",
    pa.assigned_by as "Назначил (ID)",
    pa.created_at as "Создано",
    pa.updated_at as "Обновлено"
FROM public.presentation_assignments pa
LEFT JOIN public.users u ON pa.participant_id = u.id
LEFT JOIN public.positions p ON u.position_id = p.id
LEFT JOIN public.territories t ON u.territory_id = t.id
WHERE pa.exam_event_id = '36520f72-c191-4e32-ba02-aa17c482c50b'
ORDER BY pa.presentation_number;

-- Также покажем общую статистику
SELECT 
    COUNT(*) as "Всего назначений",
    MIN(presentation_number) as "Минимальный номер",
    MAX(presentation_number) as "Максимальный номер",
    COUNT(DISTINCT presentation_number) as "Уникальных номеров"
FROM public.presentation_assignments 
WHERE exam_event_id = '36520f72-c191-4e32-ba02-aa17c482c50b';

-- Проверим есть ли дубликаты номеров
SELECT 
    presentation_number,
    COUNT(*) as "Количество участников с этим номером",
    STRING_AGG(u.full_name, ', ') as "Участники"
FROM public.presentation_assignments pa
LEFT JOIN public.users u ON pa.participant_id = u.id
WHERE pa.exam_event_id = '36520f72-c191-4e32-ba02-aa17c482c50b'
GROUP BY presentation_number
HAVING COUNT(*) > 1
ORDER BY presentation_number;
