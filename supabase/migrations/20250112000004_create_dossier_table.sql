-- Создание таблицы для досье резервистов
CREATE TABLE IF NOT EXISTS participant_dossiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  photo_url TEXT,
  program_name TEXT,
  position TEXT,
  territory TEXT,
  age INTEGER,
  experience_in_position TEXT,
  education JSONB DEFAULT '{}',
  career_path TEXT,
  achievements TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальность: один досье на пользователя на событие
  UNIQUE(user_id, event_id)
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_participant_dossiers_user_id ON participant_dossiers(user_id);
CREATE INDEX IF NOT EXISTS idx_participant_dossiers_event_id ON participant_dossiers(event_id);

-- Включение RLS
ALTER TABLE participant_dossiers ENABLE ROW LEVEL SECURITY;

-- Политики RLS
CREATE POLICY "Users can view dossiers for events they have access to" ON participant_dossiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = participant_dossiers.event_id 
      AND (
        e.creator_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM event_participants ep 
          WHERE ep.event_id = e.id 
          AND ep.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert dossiers for events they have access to" ON participant_dossiers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = participant_dossiers.event_id 
      AND (
        e.creator_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM event_participants ep 
          WHERE ep.event_id = e.id 
          AND ep.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update dossiers for events they have access to" ON participant_dossiers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = participant_dossiers.event_id 
      AND (
        e.creator_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM event_participants ep 
          WHERE ep.event_id = e.id 
          AND ep.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete dossiers for events they have access to" ON participant_dossiers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = participant_dossiers.event_id 
      AND (
        e.creator_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM event_participants ep 
          WHERE ep.event_id = e.id 
          AND ep.user_id = auth.uid()
        )
      )
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_participant_dossiers_updated_at 
  BEFORE UPDATE ON participant_dossiers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
