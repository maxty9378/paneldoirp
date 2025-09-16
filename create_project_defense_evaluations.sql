-- Создание таблицы для оценок защиты проектов
CREATE TABLE IF NOT EXISTS public.project_defense_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    reservist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    presentation_number INTEGER NOT NULL CHECK (presentation_number BETWEEN 1 AND 10),
    criteria_scores JSONB NOT NULL DEFAULT '{
        "goal_achievement": 0,
        "topic_development": 0,
        "document_quality": 0
    }',
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exam_event_id, reservist_id, evaluator_id)
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_project_defense_evaluations_exam_event ON public.project_defense_evaluations(exam_event_id);
CREATE INDEX IF NOT EXISTS idx_project_defense_evaluations_reservist ON public.project_defense_evaluations(reservist_id);
CREATE INDEX IF NOT EXISTS idx_project_defense_evaluations_evaluator ON public.project_defense_evaluations(evaluator_id);

-- Включение RLS
ALTER TABLE public.project_defense_evaluations ENABLE ROW LEVEL SECURITY;

-- Политики RLS
-- Удаляем существующие политики если они есть
DROP POLICY IF EXISTS "Users can view project defense evaluations" ON public.project_defense_evaluations;
DROP POLICY IF EXISTS "Experts can insert project defense evaluations" ON public.project_defense_evaluations;
DROP POLICY IF EXISTS "Experts can update project defense evaluations" ON public.project_defense_evaluations;
DROP POLICY IF EXISTS "Experts can delete project defense evaluations" ON public.project_defense_evaluations;

-- Политика для чтения: только эксперты могут видеть все оценки, участники видят только свои
CREATE POLICY "Users can view project defense evaluations" ON public.project_defense_evaluations
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
CREATE POLICY "Experts can insert project defense evaluations" ON public.project_defense_evaluations
FOR INSERT WITH CHECK (
    auth.uid() = evaluator_id 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'expert'::user_role_enum, 'trainer'::user_role_enum)
    )
);

CREATE POLICY "Experts can update project defense evaluations" ON public.project_defense_evaluations
FOR UPDATE USING (
    auth.uid() = evaluator_id 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'expert'::user_role_enum, 'trainer'::user_role_enum)
    )
);

-- Политика для удаления: только эксперты могут удалять свои оценки
CREATE POLICY "Experts can delete project defense evaluations" ON public.project_defense_evaluations
FOR DELETE USING (
    auth.uid() = evaluator_id 
    AND EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'expert'::user_role_enum, 'trainer'::user_role_enum)
    )
);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_project_defense_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_project_defense_evaluations_updated_at ON public.project_defense_evaluations;
CREATE TRIGGER trigger_update_project_defense_evaluations_updated_at
    BEFORE UPDATE ON public.project_defense_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_project_defense_evaluations_updated_at();

-- Комментарии к таблице и колонкам
COMMENT ON TABLE public.project_defense_evaluations IS 'Оценки защиты проектов участников экзаменов';
COMMENT ON COLUMN public.project_defense_evaluations.exam_event_id IS 'ID экзаменационного события';
COMMENT ON COLUMN public.project_defense_evaluations.reservist_id IS 'ID участника (резервиста)';
COMMENT ON COLUMN public.project_defense_evaluations.evaluator_id IS 'ID эксперта, проводящего оценку';
COMMENT ON COLUMN public.project_defense_evaluations.presentation_number IS 'Номер выступления участника (1-10)';
COMMENT ON COLUMN public.project_defense_evaluations.criteria_scores IS 'Оценки по критериям: goal_achievement (достижение цели), topic_development (проработка темы), document_quality (качество документов)';
COMMENT ON COLUMN public.project_defense_evaluations.comments IS 'Дополнительные комментарии эксперта';
