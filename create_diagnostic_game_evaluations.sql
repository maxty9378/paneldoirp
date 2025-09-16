-- Создание таблицы для оценок диагностической игры
CREATE TABLE IF NOT EXISTS public.diagnostic_game_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    reservist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    competency_scores JSONB NOT NULL DEFAULT '{
        "results_orientation": 0,
        "effective_communication": 0,
        "teamwork_skills": 0,
        "systemic_thinking": 0
    }',
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_event_id, reservist_id, evaluator_id)
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_diagnostic_game_evaluations_exam_event ON public.diagnostic_game_evaluations(exam_event_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_game_evaluations_reservist ON public.diagnostic_game_evaluations(reservist_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_game_evaluations_evaluator ON public.diagnostic_game_evaluations(evaluator_id);

-- Включение RLS
ALTER TABLE public.diagnostic_game_evaluations ENABLE ROW LEVEL SECURITY;

-- Политики RLS
-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Users can view diagnostic game evaluations" ON public.diagnostic_game_evaluations;
DROP POLICY IF EXISTS "Experts can insert diagnostic game evaluations" ON public.diagnostic_game_evaluations;
DROP POLICY IF EXISTS "Experts can update diagnostic game evaluations" ON public.diagnostic_game_evaluations;
DROP POLICY IF EXISTS "Experts can delete diagnostic game evaluations" ON public.diagnostic_game_evaluations;

-- Политика для чтения: только эксперты могут видеть все оценки, участники видят только свои
CREATE POLICY "Users can view diagnostic game evaluations" ON public.diagnostic_game_evaluations
FOR SELECT USING (
    auth.uid() = evaluator_id 
    OR auth.uid() = reservist_id
    OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'expert'::user_role_enum, 'trainer'::user_role_enum)
    )
);

-- Политика для создания и изменения: только эксперты могут создавать/изменять оценки
CREATE POLICY "Experts can insert diagnostic game evaluations" ON public.diagnostic_game_evaluations
FOR INSERT WITH CHECK (
    auth.uid() = evaluator_id 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'expert'::user_role_enum, 'trainer'::user_role_enum)
    )
);

CREATE POLICY "Experts can update diagnostic game evaluations" ON public.diagnostic_game_evaluations
FOR UPDATE USING (
    auth.uid() = evaluator_id 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'expert'::user_role_enum, 'trainer'::user_role_enum)
    )
);

-- Политика для удаления: только эксперты могут удалять свои оценки
CREATE POLICY "Experts can delete diagnostic game evaluations" ON public.diagnostic_game_evaluations
FOR DELETE USING (
    auth.uid() = evaluator_id 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'expert'::user_role_enum, 'trainer'::user_role_enum)
    )
);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_diagnostic_game_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_diagnostic_game_evaluations_updated_at ON public.diagnostic_game_evaluations;
CREATE TRIGGER trigger_update_diagnostic_game_evaluations_updated_at
    BEFORE UPDATE ON public.diagnostic_game_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_diagnostic_game_evaluations_updated_at();

-- Функция валидации компетенций для проверки корректности оценок (1-5 с шагом 0.5)
CREATE OR REPLACE FUNCTION validate_competency_scores(scores JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    score_value NUMERIC;
    key TEXT;
BEGIN
    -- Проверяем каждую компетенцию
    FOR key IN SELECT jsonb_object_keys(scores) LOOP
        score_value := (scores->>key)::NUMERIC;
        
        -- Проверяем, что оценка в допустимом диапазоне и кратна 0.5
        IF score_value < 1 OR score_value > 5 OR (score_value * 2) != FLOOR(score_value * 2) THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Добавляем проверочное ограничение для валидации оценок компетенций
ALTER TABLE public.diagnostic_game_evaluations 
ADD CONSTRAINT check_competency_scores_valid 
CHECK (validate_competency_scores(competency_scores));

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.diagnostic_game_evaluations IS 'Оценки диагностической игры (управленческих компетенций) участников экзаменов';
COMMENT ON COLUMN public.diagnostic_game_evaluations.exam_event_id IS 'ID экзаменационного события';
COMMENT ON COLUMN public.diagnostic_game_evaluations.reservist_id IS 'ID участника (резервиста)';
COMMENT ON COLUMN public.diagnostic_game_evaluations.evaluator_id IS 'ID эксперта, проводящего оценку';
COMMENT ON COLUMN public.diagnostic_game_evaluations.competency_scores IS 'Оценки по компетенциям: results_orientation (ориентация на результат), effective_communication (эффективная коммуникация), teamwork_skills (умение работать в команде), systemic_thinking (системное мышление). Оценки от 1 до 5 с шагом 0.5';
COMMENT ON COLUMN public.diagnostic_game_evaluations.comments IS 'Дополнительные комментарии эксперта';

-- Комментарий к функции валидации
COMMENT ON FUNCTION validate_competency_scores(JSONB) IS 'Функция для валидации оценок компетенций. Проверяет, что все оценки находятся в диапазоне 1-5 и кратны 0.5';
