-- Создание таблиц для системы экзамена кадрового резерва

-- Таблица конфигурации экзамена
CREATE TABLE exam_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  total_duration_hours INTEGER NOT NULL DEFAULT 8,
  break_duration_minutes INTEGER NOT NULL DEFAULT 30,
  max_participants INTEGER NOT NULL DEFAULT 20,
  evaluation_criteria JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица расписания экзамена
CREATE TABLE exam_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL CHECK (stage IN ('case_defense', 'project_defense', 'diagnostic_game')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  evaluators UUID[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Таблица досье резервистов
CREATE TABLE reservist_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  department TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 0,
  education TEXT,
  achievements TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  development_areas TEXT[] DEFAULT '{}',
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_event_id, user_id)
);

-- Таблица оценок экзамена
CREATE TABLE exam_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reservist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL CHECK (stage IN ('case_defense', 'project_defense', 'diagnostic_game')),
  evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}',
  comments TEXT,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_event_id, reservist_id, stage, evaluator_id)
);

-- Таблица участников экзамена
CREATE TABLE exam_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'attended', 'completed', 'disqualified')),
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmation_date TIMESTAMP WITH TIME ZONE,
  attendance_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_event_id, user_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_exam_configs_event_id ON exam_configs(exam_event_id);
CREATE INDEX idx_exam_schedules_event_id ON exam_schedules(exam_event_id);
CREATE INDEX idx_exam_schedules_stage ON exam_schedules(stage);
CREATE INDEX idx_exam_schedules_start_time ON exam_schedules(start_time);
CREATE INDEX idx_reservist_dossiers_event_id ON reservist_dossiers(exam_event_id);
CREATE INDEX idx_reservist_dossiers_user_id ON reservist_dossiers(user_id);
CREATE INDEX idx_exam_evaluations_event_id ON exam_evaluations(exam_event_id);
CREATE INDEX idx_exam_evaluations_reservist_id ON exam_evaluations(reservist_id);
CREATE INDEX idx_exam_evaluations_stage ON exam_evaluations(stage);
CREATE INDEX idx_exam_participants_event_id ON exam_participants(exam_event_id);
CREATE INDEX idx_exam_participants_user_id ON exam_participants(user_id);
CREATE INDEX idx_exam_participants_status ON exam_participants(status);

-- RLS политики
ALTER TABLE exam_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservist_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_participants ENABLE ROW LEVEL SECURITY;

-- Политики для exam_configs
CREATE POLICY "Admins can manage exam configs" ON exam_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator')
    )
  );

-- Политики для exam_schedules
CREATE POLICY "Admins can manage exam schedules" ON exam_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator')
    )
  );

-- Политики для reservist_dossiers
CREATE POLICY "Admins can manage dossiers" ON reservist_dossiers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator')
    )
  );

CREATE POLICY "Users can view own dossier" ON reservist_dossiers
  FOR SELECT USING (user_id = auth.uid());

-- Политики для exam_evaluations
CREATE POLICY "Admins can manage evaluations" ON exam_evaluations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator')
    )
  );

CREATE POLICY "Evaluators can manage their evaluations" ON exam_evaluations
  FOR ALL USING (evaluator_id = auth.uid());

CREATE POLICY "Reservists can view their evaluations" ON exam_evaluations
  FOR SELECT USING (reservist_id = auth.uid());

-- Политики для exam_participants
CREATE POLICY "Admins can manage participants" ON exam_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator')
    )
  );

CREATE POLICY "Users can view own participation" ON exam_participants
  FOR SELECT USING (user_id = auth.uid());

-- Функции для обновления updated_at
CREATE OR REPLACE FUNCTION update_exam_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_exam_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reservist_dossiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_exam_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_exam_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
CREATE TRIGGER update_exam_configs_updated_at
  BEFORE UPDATE ON exam_configs
  FOR EACH ROW EXECUTE FUNCTION update_exam_configs_updated_at();

CREATE TRIGGER update_exam_schedules_updated_at
  BEFORE UPDATE ON exam_schedules
  FOR EACH ROW EXECUTE FUNCTION update_exam_schedules_updated_at();

CREATE TRIGGER update_reservist_dossiers_updated_at
  BEFORE UPDATE ON reservist_dossiers
  FOR EACH ROW EXECUTE FUNCTION update_reservist_dossiers_updated_at();

CREATE TRIGGER update_exam_evaluations_updated_at
  BEFORE UPDATE ON exam_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_exam_evaluations_updated_at();

CREATE TRIGGER update_exam_participants_updated_at
  BEFORE UPDATE ON exam_participants
  FOR EACH ROW EXECUTE FUNCTION update_exam_participants_updated_at();
