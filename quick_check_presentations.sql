-- Быстрая проверка номеров выступлений

SELECT 
    pa.presentation_number as "№",
    u.full_name as "Участник",
    p.name as "Должность"
FROM public.presentation_assignments pa
LEFT JOIN public.users u ON pa.participant_id = u.id
LEFT JOIN public.positions p ON u.position_id = p.id
WHERE pa.exam_event_id = '36520f72-c191-4e32-ba02-aa17c482c50b'
ORDER BY pa.presentation_number;
