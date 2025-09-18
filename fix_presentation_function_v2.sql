-- Исправленная версия функции assign_presentation_numbers_batch
-- Убираем проверку конфликтов и сначала очищаем старые назначения

-- Удаляем старую версию функции
DROP FUNCTION IF EXISTS assign_presentation_numbers_batch(UUID, TEXT, UUID);

-- Создаем новую версию без проверки конфликтов
CREATE OR REPLACE FUNCTION assign_presentation_numbers_batch(
    p_exam_event_id UUID,
    p_assignments TEXT, -- Принимает JSON как строку
    p_assigned_by UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    assignment JSONB;
    v_participant_id UUID;
    v_presentation_number INTEGER;
    assignments_array JSONB;
BEGIN
    -- Проверяем права доступа
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = p_assigned_by 
        AND role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum)
    ) THEN
        RETURN QUERY SELECT false, 'Недостаточно прав доступа'::TEXT;
        RETURN;
    END IF;

    -- Преобразуем строку в JSONB
    BEGIN
        assignments_array := p_assignments::JSONB;
    EXCEPTION 
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, 'Неверный формат данных назначений'::TEXT;
            RETURN;
    END;

    -- Проверяем, что это массив
    IF jsonb_typeof(assignments_array) != 'array' THEN
        RETURN QUERY SELECT false, 'Назначения должны быть массивом'::TEXT;
        RETURN;
    END IF;

    -- Начинаем транзакцию
    BEGIN
        -- Сначала удаляем все старые назначения для данного экзамена
        DELETE FROM public.presentation_assignments 
        WHERE exam_event_id = p_exam_event_id;

        -- Обрабатываем каждое назначение
        FOR assignment IN SELECT * FROM jsonb_array_elements(assignments_array)
        LOOP
            -- Проверяем структуру объекта назначения
            IF NOT (assignment ? 'participant_id' AND assignment ? 'presentation_number') THEN
                RETURN QUERY SELECT false, 'Неверная структура данных назначения'::TEXT;
                RETURN;
            END IF;

            v_participant_id := (assignment->>'participant_id')::UUID;
            v_presentation_number := (assignment->>'presentation_number')::INTEGER;
            
            -- Вставляем новое назначение
            INSERT INTO public.presentation_assignments (
                exam_event_id, 
                participant_id, 
                presentation_number, 
                assigned_by,
                created_at,
                updated_at
            ) VALUES (
                p_exam_event_id, 
                v_participant_id, 
                v_presentation_number, 
                p_assigned_by,
                NOW(),
                NOW()
            );
        END LOOP;
        
        RETURN QUERY SELECT true, 'Номера выступлений успешно назначены'::TEXT;
        
    EXCEPTION 
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql;

-- Обновляем комментарий
COMMENT ON FUNCTION assign_presentation_numbers_batch(UUID, TEXT, UUID) IS 'Массовое назначение номеров выступлений без проверки конфликтов';

-- Проверяем, что функция создана правильно
SELECT 'Функция успешно создана' as status;
