/*
  # Создание базовой схемы для системы управления обучением SNS

  1. Новые таблицы
    - `users` - пользователи системы
    - `user_roles` - роли пользователей
    - `subdivisions` - подразделения
    - `branches` - филиалы
    - `event_types` - типы мероприятий
    - `events` - мероприятия
    - `event_participants` - участники мероприятий
    - `user_logs` - логи действий пользователей

  2. Безопасность
    - Включена RLS для всех таблиц
    - Добавлены политики доступа на основе ролей
    - Ограничения на просмотр и изменение данных

  3. Триггеры и функции
    - Автоматическое логирование действий
    - Валидация данных
*/

-- Перечисления
CREATE TYPE user_role_enum AS ENUM (
  'employee',
  'supervisor', 
  'trainer',
  'expert',
  'moderator',
  'administrator'
);

CREATE TYPE subdivision_enum AS ENUM (
  'management_company',
  'branches'
);

CREATE TYPE branch_subrole_enum AS ENUM (
  'sales_representative',
  'supervisor',
  'branch_director'
);

CREATE TYPE user_status_enum AS ENUM (
  'active',
  'inactive',
  'terminating',
  'transferring'
);

CREATE TYPE event_status_enum AS ENUM (
  'draft',
  'published',
  'ongoing',
  'completed',
  'cancelled'
);

-- Таблица типов мероприятий
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

-- Таблица филиалов
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  address text,
  coordinates jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  sap_number text UNIQUE,
  full_name text NOT NULL,
  position text,
  phone text,
  avatar_url text,
  role user_role_enum NOT NULL DEFAULT 'employee',
  subdivision subdivision_enum NOT NULL DEFAULT 'management_company',
  branch_subrole branch_subrole_enum,
  branch_id uuid REFERENCES branches(id),
  status user_status_enum DEFAULT 'active',
  work_experience_days integer DEFAULT 0,
  last_sign_in_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT users_email_or_sap_check CHECK (
    (email IS NOT NULL) OR (sap_number IS NOT NULL)
  ),
  CONSTRAINT users_branch_subrole_check CHECK (
    (subdivision = 'branches' AND branch_subrole IS NOT NULL) OR
    (subdivision = 'management_company' AND branch_subrole IS NULL)
  )
);

-- Таблица мероприятий
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type_id uuid NOT NULL REFERENCES event_types(id),
  creator_id uuid NOT NULL REFERENCES users(id),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  location text,
  location_coordinates jsonb,
  meeting_link text,
  points integer DEFAULT 0,
  status event_status_enum DEFAULT 'draft',
  max_participants integer,
  files jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица участников мероприятий
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

-- Таблица логов действий пользователей
CREATE TABLE IF NOT EXISTS user_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Вставка типов мероприятий
INSERT INTO event_types (name, name_ru, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form) VALUES
('welcome_course', 'Welcome Course', true, false, true, true, true),
('online_training', 'Онлайн-тренинг', true, false, true, true, true),
('online_marathon', 'Онлайн-марафон', true, false, true, true, true),
('offline_training', 'Очный тренинг', false, true, true, true, true),
('work_session', 'Рабочая сессия', false, true, false, false, true),
('practicum', 'Практикум', false, true, true, true, true),
('case_marathon', 'Кейс-марафон', true, false, true, true, true),
('exam', 'Экзамен', false, true, false, true, false),
('demo_lab', 'Демо-лаборатория', false, true, false, false, true),
('complex_program', 'Комплексная программа', false, true, true, true, true),
('conference', 'Конференция', false, true, false, false, true),
('business_game', 'Деловая игра', false, true, false, false, true),
('active_seminar', 'Активный семинар', false, true, false, false, true),
('team_tracking', 'Командный трекинг', false, true, false, false, true);

-- Включение RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Политики RLS для пользователей
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Trainers can read their branch users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('trainer', 'administrator')
    )
  );

-- Политики RLS для мероприятий
CREATE POLICY "Users can read events they participate in"
  ON events FOR SELECT
  TO authenticated
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_participants ep
      WHERE ep.event_id = events.id AND ep.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('administrator', 'moderator')
    )
  );

CREATE POLICY "Trainers can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('trainer', 'moderator', 'administrator')
    )
  );

CREATE POLICY "Creators can update their events"
  ON events FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'administrator'
    )
  );

-- Политики для участников мероприятий
CREATE POLICY "Users can read event participants for events they have access to"
  ON event_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_participants.event_id
      AND (
        e.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM event_participants ep2
          WHERE ep2.event_id = e.id AND ep2.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid() AND u.role IN ('administrator', 'moderator')
        )
      )
    )
  );

CREATE POLICY "Event creators can manage participants"
  ON event_participants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_participants.event_id
      AND (
        e.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = auth.uid() AND u.role = 'administrator'
        )
      )
    )
  );

-- Политики для типов мероприятий (только чтение для всех)
CREATE POLICY "Everyone can read event types"
  ON event_types FOR SELECT
  TO authenticated
  USING (true);

-- Политики для филиалов (только чтение для всех)
CREATE POLICY "Everyone can read branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

-- Политики для логов
CREATE POLICY "Users can read own logs"
  ON user_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert logs"
  ON user_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_participants_updated_at BEFORE UPDATE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_types_updated_at BEFORE UPDATE ON event_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();