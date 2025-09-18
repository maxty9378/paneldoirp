-- Проверка таблицы presentation_assignments и данных

-- Проверяем существование таблицы
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'presentation_assignments'
ORDER BY ordinal_position;

-- Проверяем данные в таблице
SELECT 
    exam_event_id,
    participant_id,
    presentation_number,
    assigned_by,
    created_at,
    updated_at
FROM public.presentation_assignments
WHERE exam_event_id = '36520f72-c191-4e32-ba02-aa17c482c50b'
ORDER BY presentation_number;

-- Проверяем общее количество записей
SELECT COUNT(*) as total_assignments 
FROM public.presentation_assignments;

-- Проверяем права доступа текущего пользователя
SELECT 
    id,
    full_name,
    role,
    email
FROM public.users 
WHERE role IN ('administrator', 'moderator');

-- Проверяем существование функции
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'assign_presentation_numbers_batch';
