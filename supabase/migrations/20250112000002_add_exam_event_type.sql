-- Добавление типа мероприятия "Экзамен кадрового резерва"

INSERT INTO event_types (
  name,
  name_ru,
  description,
  is_online,
  requires_location,
  has_entry_test,
  has_final_test,
  has_feedback_form
) VALUES (
  'exam_talent_reserve',
  'Экзамен кадрового резерва',
  'Комплексная оценка кандидатов в кадровый резерв через защиту кейсов, проектов и диагностическую игру',
  false,
  true,
  false,
  true,
  true
) ON CONFLICT (name) DO NOTHING;

-- Добавление категорий талантов для экзамена
CREATE TABLE IF NOT EXISTS talent_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  name_ru VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Вставка категорий талантов
INSERT INTO talent_categories (name, name_ru, description, color) VALUES
('talent_sv', 'Таланты СВ', 'Специалисты высокого уровня с уникальными компетенциями', '#8B5CF6'),
('potential_gdf', 'Потенциал ГДФ', 'Потенциальные руководители с лидерскими качествами', '#F59E0B'),
('professionals_rm', 'Профессионалы РМ', 'Профессиональные менеджеры с управленческим опытом', '#10B981')
ON CONFLICT (name) DO NOTHING;

-- Добавление связи между экзаменами и категориями талантов
ALTER TABLE events ADD COLUMN IF NOT EXISTS talent_category_id UUID REFERENCES talent_categories(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS group_name VARCHAR(200);
ALTER TABLE events ADD COLUMN IF NOT EXISTS expert_emails TEXT[];

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_events_talent_category ON events(talent_category_id);
CREATE INDEX IF NOT EXISTS idx_events_group_name ON events(group_name);

