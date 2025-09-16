-- Создание таблицы для назначения номеров выступлений
CREATE TABLE IF NOT EXISTS public.presentation_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    presentation_number INTEGER NOT NULL CHECK (presentation_number BETWEEN 1 AND 50),
    assigned_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_event_id, participant_id),
    UNIQUE(exam_event_id, presentation_number)
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_presentation_assignments_exam_event ON public.presentation_assignments(exam_event_id);
CREATE INDEX IF NOT EXISTS idx_presentation_assignments_participant ON public.presentation_assignments(participant_id);
CREATE INDEX IF NOT EXISTS idx_presentation_assignments_assigned_by ON public.presentation_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_presentation_assignments_number ON public.presentation_assignments(exam_event_id, presentation_number);

-- Включение RLS
ALTER TABLE public.presentation_assignments ENABLE ROW LEVEL SECURITY;

-- Политики RLS
-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Users can view presentation assignments" ON public.presentation_assignments;
DROP POLICY IF EXISTS "Admins can manage presentation assignments" ON public.presentation_assignments;

-- Политика для чтения: все могут видеть назначения
CREATE POLICY "Users can view presentation assignments" ON public.presentation_assignments
FOR SELECT USING (
    true -- Все могут видеть назначения номеров выступлений
);

-- Политика для создания/изменения/удаления: только администраторы
CREATE POLICY "Admins can manage presentation assignments" ON public.presentation_assignments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum)
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum)
    )
);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_presentation_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_presentation_assignments_updated_at ON public.presentation_assignments;
CREATE TRIGGER trigger_update_presentation_assignments_updated_at
    BEFORE UPDATE ON public.presentation_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_presentation_assignments_updated_at();

-- Функция для получения следующего доступного номера выступления
CREATE OR REPLACE FUNCTION get_next_presentation_number(p_exam_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_number INTEGER := 1;
BEGIN
    -- Находим минимальный доступный номер
    WHILE EXISTS (
        SELECT 1 FROM public.presentation_assignments 
        WHERE exam_event_id = p_exam_event_id 
        AND presentation_number = next_number
    ) LOOP
        next_number := next_number + 1;
    END LOOP;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старую версию функции с JSONB параметром
DROP FUNCTION IF EXISTS assign_presentation_numbers_batch(UUID, JSONB, UUID);

-- Функция для массового назначения номеров выступлений
CREATE OR REPLACE FUNCTION assign_presentation_numbers_batch(
    p_exam_event_id UUID,
    p_assignments TEXT, -- Изменили на TEXT для приема JSON строки
    p_assigned_by UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    assignment JSONB;
    participant_id UUID;
    presentation_number INTEGER;
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

            participant_id := (assignment->>'participant_id')::UUID;
            presentation_number := (assignment->>'presentation_number')::INTEGER;
            
            -- Проверяем, что номер не занят другим участником
            SELECT COUNT(*) INTO existing_count 
            FROM public.presentation_assignments pa
            WHERE pa.exam_event_id = p_exam_event_id 
            AND pa.presentation_number = presentation_number
            AND pa.participant_id != assign_presentation_numbers_batch.participant_id;
            
            IF existing_count > 0 THEN
                RETURN QUERY SELECT false, FORMAT('Номер выступления %s уже занят', presentation_number)::TEXT;
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
                participant_id, 
                presentation_number, 
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

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.presentation_assignments IS 'Назначения номеров выступлений для защиты проектов';
COMMENT ON COLUMN public.presentation_assignments.exam_event_id IS 'ID экзаменационного события';
COMMENT ON COLUMN public.presentation_assignments.participant_id IS 'ID участника (резервиста)';
COMMENT ON COLUMN public.presentation_assignments.presentation_number IS 'Номер выступления (1-50)';
COMMENT ON COLUMN public.presentation_assignments.assigned_by IS 'ID администратора, назначившего номер';

-- Комментарии к функциям
COMMENT ON FUNCTION get_next_presentation_number(UUID) IS 'Возвращает следующий доступный номер выступления для экзамена';
COMMENT ON FUNCTION assign_presentation_numbers_batch(UUID, TEXT, UUID) IS 'Массовое назначение номеров выступлений с проверкой конфликтов';
