-- Создание таблицы для назначения кейсов участникам
CREATE TABLE IF NOT EXISTS case_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_numbers INTEGER[] NOT NULL DEFAULT '{}',
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Уникальность: один участник в одном экзамене может иметь только одно назначение
    UNIQUE(exam_event_id, participant_id)
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_case_assignments_exam_event ON case_assignments(exam_event_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_participant ON case_assignments(participant_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_assigned_by ON case_assignments(assigned_by);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_case_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_case_assignments_updated_at
    BEFORE UPDATE ON case_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_case_assignments_updated_at();

-- Настройка RLS (Row Level Security)
ALTER TABLE case_assignments ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
-- Администраторы могут управлять всеми назначениями
CREATE POLICY "Administrators can manage all case assignments" ON case_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'administrator'
        )
    );

-- Эксперты могут видеть назначения для экзаменов, к которым у них есть доступ
CREATE POLICY "Experts can view relevant case assignments" ON case_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_participants ep
            WHERE ep.event_id = case_assignments.exam_event_id
            AND ep.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('expert', 'administrator')
        )
    );

-- Участники могут видеть только свои назначения
CREATE POLICY "Participants can view their case assignments" ON case_assignments
    FOR SELECT USING (participant_id = auth.uid());

-- Комментарий к таблице
COMMENT ON TABLE case_assignments IS 'Таблица для назначения номеров кейсов участникам экзаменов';

-- Комментарии к колонкам
COMMENT ON COLUMN case_assignments.exam_event_id IS 'ID экзамена';
COMMENT ON COLUMN case_assignments.participant_id IS 'ID участника (резервиста)';
COMMENT ON COLUMN case_assignments.case_numbers IS 'Массив номеров назначенных кейсов';
COMMENT ON COLUMN case_assignments.assigned_by IS 'ID администратора, который назначил кейсы';

-- Уведомление об успешном создании
NOTIFY pgrst, 'reload schema';
