/*
  # Create event tables

  1. New Tables
    - `event_types` for storing different types of events
    - `event_participants` to track event attendance
    - `event_files` to manage event attachments
  
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Create event_types table
CREATE TABLE IF NOT EXISTS event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_ru text NOT NULL,
  description text,
  is_online boolean DEFAULT false,
  requires_location boolean DEFAULT false,
  has_entry_test boolean DEFAULT false,
  has_final_test boolean DEFAULT false,
  has_feedback_form boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type_id uuid REFERENCES event_types(id),
  creator_id uuid REFERENCES users(id),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  location text,
  location_coordinates jsonb,
  meeting_link text,
  points integer DEFAULT 0,
  status event_status_enum DEFAULT 'draft',
  max_participants integer,
  files jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event participants table
CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  attended boolean DEFAULT false,
  entry_test_score integer,
  final_test_score integer,
  feedback_score integer,
  competency_scores jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create event files table
CREATE TABLE IF NOT EXISTS event_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_files ENABLE ROW LEVEL SECURITY;

-- Event types policies (everyone can read)
CREATE POLICY "Everyone can read event types"
  ON event_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Events policies
CREATE POLICY "Trainers can create events"
  ON events
  FOR INSERT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = ANY(ARRAY['trainer', 'moderator', 'administrator'])
  ));

CREATE POLICY "Creators can update their events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    (creator_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'
    ))
  );

CREATE POLICY "Users can read events they participate in"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    (creator_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = events.id
      AND user_id = auth.uid()
    )) OR
    (EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = ANY(ARRAY['administrator', 'moderator'])
    ))
  );

-- Event participants policies
CREATE POLICY "Event creators can manage participants"
  ON event_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_participants.event_id
      AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND role = 'administrator'
        )
      )
    )
  );

CREATE POLICY "Users can read event participants for events they have access to"
  ON event_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_participants.event_id
      AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_participants ep2
          WHERE ep2.event_id = id
          AND ep2.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND role = ANY(ARRAY['administrator', 'moderator'])
        )
      )
    )
  );

-- Event files policies
CREATE POLICY "Event creators can manage files"
  ON event_files
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_files.event_id
      AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND role = 'administrator'
        )
      )
    )
  );

CREATE POLICY "Users can view files for events they participate in"
  ON event_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_files.event_id
      AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_participants
          WHERE event_id = events.id
          AND user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND role = ANY(ARRAY['administrator', 'moderator'])
        )
      )
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_event_types_updated_at
BEFORE UPDATE ON event_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_participants_updated_at
BEFORE UPDATE ON event_participants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert sample event types
INSERT INTO event_types (name, name_ru, description, is_online, requires_location, has_entry_test, has_final_test)
VALUES
('online_training', 'Онлайн-тренинг', 'Обучающее мероприятие, проводимое удаленно', true, false, true, true),
('in_person_training', 'Очный тренинг', 'Тренинг с личным присутствием участников', false, true, true, true),
('webinar', 'Вебинар', 'Онлайн-семинар с возможностью общения с ведущим', true, false, false, false),
('workshop', 'Мастер-класс', 'Интерактивное практическое занятие', false, true, false, true),
('conference', 'Конференция', 'Масштабное мероприятие с множеством спикеров', false, true, false, false),
('exam', 'Экзамен', 'Проверка знаний и навыков', false, true, true, false),
('welcome_course', 'Welcome Course', 'Вводное обучение для новых сотрудников', true, false, true, true)
ON CONFLICT (name) DO NOTHING;

-- Add user_id column to auth.users
-- This requires superuser privileges and would normally be done separately
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM information_schema.columns 
--     WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'user_id'
--   ) THEN
--     ALTER TABLE auth.users ADD COLUMN user_id uuid REFERENCES public.users(id);
--   END IF;
-- END $$;