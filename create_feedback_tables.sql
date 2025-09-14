-- Создание таблиц для системы обратной связи
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Создаем таблицу шаблонов обратной связи
CREATE TABLE IF NOT EXISTS feedback_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    event_type_id UUID REFERENCES event_types(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Создаем таблицу вопросов обратной связи
CREATE TABLE IF NOT EXISTS feedback_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES feedback_templates(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('rating', 'text', 'choice', 'multiple_choice')),
    is_required BOOLEAN DEFAULT true,
    options JSONB, -- для вопросов с выбором
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Создаем таблицу отправленных отзывов
CREATE TABLE IF NOT EXISTS feedback_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES feedback_templates(id) ON DELETE CASCADE,
    rating DECIMAL(3,2), -- общая оценка от 1 до 5
    comment TEXT,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'archived')),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Создаем таблицу ответов на вопросы
CREATE TABLE IF NOT EXISTS feedback_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES feedback_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES feedback_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_rating INTEGER CHECK (answer_rating >= 1 AND answer_rating <= 5),
    answer_choice TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_feedback_templates_event_type ON feedback_templates(event_type_id);
CREATE INDEX IF NOT EXISTS idx_feedback_templates_active ON feedback_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_template ON feedback_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_feedback_questions_order ON feedback_questions(template_id, order_index);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user ON feedback_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_event ON feedback_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_template ON feedback_submissions(template_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_status ON feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_answers_submission ON feedback_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_feedback_answers_question ON feedback_answers(question_id);

-- 6. Создаем триггеры для обновления updated_at
CREATE TRIGGER update_feedback_templates_updated_at
    BEFORE UPDATE ON feedback_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_questions_updated_at
    BEFORE UPDATE ON feedback_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_submissions_updated_at
    BEFORE UPDATE ON feedback_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_answers_updated_at
    BEFORE UPDATE ON feedback_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Включаем RLS
ALTER TABLE feedback_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_answers ENABLE ROW LEVEL SECURITY;

-- 8. Создаем RLS политики
CREATE POLICY "Enable all access for authenticated users" ON feedback_templates
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON feedback_questions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON feedback_submissions
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON feedback_answers
    FOR ALL USING (auth.role() = 'authenticated');

-- 9. Предоставляем права доступа
GRANT ALL ON feedback_templates TO authenticated;
GRANT ALL ON feedback_questions TO authenticated;
GRANT ALL ON feedback_submissions TO authenticated;
GRANT ALL ON feedback_answers TO authenticated;

-- 10. Создаем базовые шаблоны обратной связи
INSERT INTO feedback_templates (name, description, event_type_id, is_active) VALUES
('Общая обратная связь по мероприятию', 'Стандартная форма обратной связи для всех мероприятий', NULL, true),
('Обратная связь по онлайн-тренингу', 'Специальная форма для онлайн-тренингов', NULL, true),
('Обратная связь по очному мероприятию', 'Форма для очных мероприятий', NULL, true);

-- 11. Создаем базовые вопросы для общего шаблона
WITH general_template AS (
    SELECT id FROM feedback_templates WHERE name = 'Общая обратная связь по мероприятию' LIMIT 1
)
INSERT INTO feedback_questions (template_id, question_text, question_type, is_required, order_index) VALUES
((SELECT id FROM general_template), 'Оцените общее качество мероприятия (1-5)', 'rating', true, 1),
((SELECT id FROM general_template), 'Оцените полезность полученной информации (1-5)', 'rating', true, 2),
((SELECT id FROM general_template), 'Оцените качество организации мероприятия (1-5)', 'rating', true, 3),
((SELECT id FROM general_template), 'Оцените работу тренера/презентатора (1-5)', 'rating', true, 4),
((SELECT id FROM general_template), 'Рекомендуете ли вы это мероприятие коллегам?', 'choice', true, 5),
((SELECT id FROM general_template), 'Что вам понравилось больше всего?', 'text', false, 6),
((SELECT id FROM general_template), 'Что можно улучшить?', 'text', false, 7),
((SELECT id FROM general_template), 'Дополнительные комментарии', 'text', false, 8);

-- 12. Обновляем вопросы с вариантами ответов
UPDATE feedback_questions 
SET options = '{"choices": ["Да, определенно", "Да, скорее всего", "Затрудняюсь ответить", "Нет, скорее всего", "Нет, определенно"]}'::jsonb
WHERE question_text = 'Рекомендуете ли вы это мероприятие коллегам?';

-- 13. Добавляем комментарии
COMMENT ON TABLE feedback_templates IS 'Шаблоны форм обратной связи';
COMMENT ON TABLE feedback_questions IS 'Вопросы в шаблонах обратной связи';
COMMENT ON TABLE feedback_submissions IS 'Отправленные отзывы участников';
COMMENT ON TABLE feedback_answers IS 'Ответы на вопросы обратной связи';

-- 14. Проверяем результат
SELECT 'Feedback Tables Created Successfully' as status;
