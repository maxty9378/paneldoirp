-- Создание таблиц для управления кейсами и их оценками

-- Таблица кейсов
CREATE TABLE IF NOT EXISTS exam_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number integer NOT NULL UNIQUE,
    title text NOT NULL,
    description text,
    correct_answer text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Таблица назначенных кейсов участникам экзамена
CREATE TABLE IF NOT EXISTS participant_assigned_cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_participant_id uuid NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    exam_case_id uuid NOT NULL REFERENCES exam_cases(id) ON DELETE CASCADE,
    assigned_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    assigned_by uuid REFERENCES auth.users(id),
    UNIQUE(event_participant_id, exam_case_id)
);

-- Таблица оценок кейсов
CREATE TABLE IF NOT EXISTS case_evaluations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_case_id uuid NOT NULL REFERENCES participant_assigned_cases(id) ON DELETE CASCADE,
    evaluator_id uuid NOT NULL REFERENCES auth.users(id),
    
    -- Критерии оценки от 1 до 5 баллов
    correctness_score integer CHECK (correctness_score >= 1 AND correctness_score <= 5),
    clarity_score integer CHECK (clarity_score >= 1 AND clarity_score <= 5),
    independence_score integer CHECK (independence_score >= 1 AND independence_score <= 5),
    
    -- Комментарии к оценкам
    correctness_comment text,
    clarity_comment text,
    independence_comment text,
    overall_comment text,
    
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(participant_case_id, evaluator_id)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_participant_assigned_cases_event_participant ON participant_assigned_cases(event_participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_assigned_cases_case ON participant_assigned_cases(exam_case_id);
CREATE INDEX IF NOT EXISTS idx_case_evaluations_participant_case ON case_evaluations(participant_case_id);
CREATE INDEX IF NOT EXISTS idx_case_evaluations_evaluator ON case_evaluations(evaluator_id);

-- RLS политики
ALTER TABLE exam_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_assigned_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_evaluations ENABLE ROW LEVEL SECURITY;

-- Политики для exam_cases
CREATE POLICY "exam_cases_select_policy" ON exam_cases
    FOR SELECT USING (true);

CREATE POLICY "exam_cases_insert_policy" ON exam_cases
    FOR INSERT WITH CHECK (true);

CREATE POLICY "exam_cases_update_policy" ON exam_cases
    FOR UPDATE USING (true);

-- Политики для participant_assigned_cases
CREATE POLICY "participant_assigned_cases_select_policy" ON participant_assigned_cases
    FOR SELECT USING (true);

CREATE POLICY "participant_assigned_cases_insert_policy" ON participant_assigned_cases
    FOR INSERT WITH CHECK (true);

CREATE POLICY "participant_assigned_cases_update_policy" ON participant_assigned_cases
    FOR UPDATE USING (true);

-- Политики для case_evaluations
CREATE POLICY "case_evaluations_select_policy" ON case_evaluations
    FOR SELECT USING (true);

CREATE POLICY "case_evaluations_insert_policy" ON case_evaluations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "case_evaluations_update_policy" ON case_evaluations
    FOR UPDATE USING (true);

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_exam_cases_updated_at 
    BEFORE UPDATE ON exam_cases 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_case_evaluations_updated_at 
    BEFORE UPDATE ON case_evaluations 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Вставка тестовых кейсов
INSERT INTO exam_cases (case_number, title, description, correct_answer) VALUES
(1, 'Кейс "Управление конфликтом в команде"', 'Ситуация с конфликтом между сотрудниками разных отделов', 'Вариант B: Организовать встречу всех сторон'),
(2, 'Кейс "Оптимизация бизнес-процессов"', 'Компания сталкивается с неэффективностью процессов', 'Вариант A: Провести аудит текущих процессов'),
(3, 'Кейс "Управление изменениями"', 'Внедрение новой IT-системы в организации', 'Вариант C: Поэтапное внедрение с обучением'),
(4, 'Кейс "Финансовое планирование"', 'Планирование бюджета на следующий год', 'Вариант B: Анализ прошлых периодов и прогнозы'),
(5, 'Кейс "Управление проектом"', 'Проект отстает от графика и превышает бюджет', 'Вариант A: Пересмотр scope и приоритетов'),
(6, 'Кейс "Развитие персонала"', 'Низкая мотивация в команде', 'Вариант C: Система мотивации и развития'),
(7, 'Кейс "Клиентский сервис"', 'Жалобы клиентов на качество обслуживания', 'Вариант B: Анализ процессов и обучение'),
(8, 'Кейс "Стратегическое планирование"', 'Выход на новый рынок', 'Вариант A: Исследование рынка и конкурентов'),
(9, 'Кейс "Цифровая трансформация"', 'Внедрение цифровых решений', 'Вариант C: Пилотное внедрение в одном подразделении'),
(10, 'Кейс "Управление рисками"', 'Выявление и минимизация операционных рисков', 'Вариант B: Создание карты рисков'),
(11, 'Кейс "Инновационное развитие"', 'Разработка новых продуктов', 'Вариант A: Создание инновационной лаборатории'),
(12, 'Кейс "Корпоративная культура"', 'Формирование единой корпоративной культуры', 'Вариант C: Программа культурных ценностей'),
(13, 'Кейс "Управление поставщиками"', 'Оптимизация цепи поставок', 'Вариант B: Диверсификация поставщиков'),
(14, 'Кейс "Качество продукции"', 'Повышение качества продукции', 'Вариант A: Внедрение системы контроля качества'),
(15, 'Кейс "Международная экспансия"', 'Выход на международные рынки', 'Вариант C: Партнерство с местными компаниями'),
(16, 'Кейс "Устойчивое развитие"', 'Внедрение принципов ESG', 'Вариант B: Комплексная программа устойчивости'),
(17, 'Кейс "Управление данными"', 'Организация работы с большими данными', 'Вариант A: Создание единой платформы данных'),
(18, 'Кейс "Кибербезопасность"', 'Обеспечение информационной безопасности', 'Вариант C: Многоуровневая система защиты'),
(19, 'Кейс "Слияние и поглощение"', 'Интеграция после M&A сделки', 'Вариант B: Поэтапная интеграция систем'),
(20, 'Кейс "Кризисное управление"', 'Управление в условиях кризиса', 'Вариант A: Антикризисный план и коммуникации');

COMMENT ON TABLE exam_cases IS 'Таблица кейсов для экзаменов';
COMMENT ON TABLE participant_assigned_cases IS 'Назначенные кейсы участникам экзамена';
COMMENT ON TABLE case_evaluations IS 'Оценки кейсов экспертами';
