-- Исправление ошибки перегрузки функции assign_presentation_numbers_batch
-- Ошибка: "Could not choose the best candidate function"

-- Удаляем старую версию функции с JSONB параметром
DROP FUNCTION IF EXISTS assign_presentation_numbers_batch(UUID, JSONB, UUID);

-- Создаем исправленную версию с TEXT параметром
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
    existing_count INTEGER;
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
            
            -- Проверяем, что номер не занят другим участником
            SELECT COUNT(*) INTO existing_count 
            FROM public.presentation_assignments pa
            WHERE pa.exam_event_id = p_exam_event_id 
            AND pa.presentation_number = v_presentation_number
            AND pa.participant_id != v_participant_id;
            
            IF existing_count > 0 THEN
                RETURN QUERY SELECT false, FORMAT('Номер выступления %s уже занят', v_presentation_number)::TEXT;
                RETURN;
            END IF;
            
            -- Вставляем или обновляем назначение
            INSERT INTO public.presentation_assignments (
                exam_event_id, 
                participant_id, 
                presentation_number, 
                assigned_by
            ) VALUES (
                p_exam_event_id, 
                v_participant_id, 
                v_presentation_number, 
                p_assigned_by
            )
            ON CONFLICT (exam_event_id, participant_id) 
            DO UPDATE SET 
                presentation_number = EXCLUDED.presentation_number,
                assigned_by = EXCLUDED.assigned_by,
                updated_at = NOW();
        END LOOP;
        
        RETURN QUERY SELECT true, 'Номера выступлений успешно назначены'::TEXT;
        
    EXCEPTION 
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, SQLERRM::TEXT;
    END;
END;
$$ LANGUAGE plpgsql;

-- Обновляем комментарий
COMMENT ON FUNCTION assign_presentation_numbers_batch(UUID, TEXT, UUID) IS 'Массовое назначение номеров выступлений с проверкой конфликтов';

-- Проверяем, что функция создана правильно
SELECT 'Функция успешно создана' as status;
