-- Создание таблицы для оценок решения кейсов
CREATE TABLE IF NOT EXISTS case_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reservist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_number INTEGER NOT NULL CHECK (case_number > 0),
    criteria_scores JSONB NOT NULL DEFAULT '{"correctness": 0, "clarity": 0, "independence": 0}',
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Уникальность: один эксперт не может оценить один кейс одного резервиста дважды
    UNIQUE(exam_event_id, reservist_id, evaluator_id, case_number)
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_case_evaluations_exam_event ON case_evaluations(exam_event_id);
CREATE INDEX IF NOT EXISTS idx_case_evaluations_reservist ON case_evaluations(reservist_id);
CREATE INDEX IF NOT EXISTS idx_case_evaluations_evaluator ON case_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_case_evaluations_case_number ON case_evaluations(case_number);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_case_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_case_evaluations_updated_at
    BEFORE UPDATE ON case_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_case_evaluations_updated_at();

-- Настройка RLS (Row Level Security)
ALTER TABLE case_evaluations ENABLE ROW LEVEL SECURITY;

-- Политики безопасности
-- Администраторы могут видеть все оценки
CREATE POLICY "Administrators can view all case evaluations" ON case_evaluations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'administrator'
        )
    );

-- Эксперты могут видеть только свои оценки
CREATE POLICY "Evaluators can view own case evaluations" ON case_evaluations
    FOR ALL USING (evaluator_id = auth.uid());

-- Участники экзамена могут видеть оценки своих кейсов
CREATE POLICY "Reservists can view their case evaluations" ON case_evaluations
    FOR SELECT USING (reservist_id = auth.uid());

-- Комментарий к таблице
COMMENT ON TABLE case_evaluations IS 'Таблица для хранения оценок решения кейсов резервистами';

-- Комментарии к колонкам
COMMENT ON COLUMN case_evaluations.exam_event_id IS 'ID экзамена';
COMMENT ON COLUMN case_evaluations.reservist_id IS 'ID резервиста';
COMMENT ON COLUMN case_evaluations.evaluator_id IS 'ID эксперта-оценщика';
COMMENT ON COLUMN case_evaluations.case_number IS 'Номер кейса (обычно 1 или 2)';
COMMENT ON COLUMN case_evaluations.criteria_scores IS 'Баллы по критериям: correctness (правильность), clarity (чёткость), independence (самостоятельность)';
COMMENT ON COLUMN case_evaluations.comments IS 'Дополнительные комментарии эксперта';

-- Уведомление об успешном создании
NOTIFY pgrst, 'reload schema';


