-- Полное восстановление структуры базы данных SNS Panel
-- Выполните этот скрипт в Supabase Dashboard SQL Editor

-- 1. Создание enum типов
CREATE TYPE user_role_enum AS ENUM ('administrator', 'moderator', 'trainer', 'employee');
CREATE TYPE test_type_enum AS ENUM ('entry', 'final', 'annual');
CREATE TYPE question_type_enum AS ENUM ('single_choice', 'multiple_choice', 'sequence', 'text');
CREATE TYPE event_status_enum AS ENUM ('planned', 'active', 'completed', 'cancelled');

-- 2. Создание таблицы event_types
CREATE TABLE IF NOT EXISTS event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 3. Создание таблицы positions
CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  level integer DEFAULT 1,
  department text,
  permissions jsonb DEFAULT '[]'::jsonb
);

-- 4. Создание таблицы territories
CREATE TABLE IF NOT EXISTS territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- 5. Создание таблицы users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  sap_number text UNIQUE,
  phone text,
  position_id uuid REFERENCES positions(id),
  territory_id uuid REFERENCES territories(id),
  work_experience_days integer,
  role user_role_enum DEFAULT 'employee',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  department text,
  is_leaving boolean DEFAULT false,
  last_activity_at timestamptz,
  password_changed_at timestamptz,
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  preferences jsonb DEFAULT '{}'::jsonb,
  notes text,
  last_sign_in_at timestamptz,
  status text DEFAULT 'active',
  subdivision text,
  branch_subrole text,
  branch_id uuid,
  avatar_url text
);

-- 6. Создание таблицы events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  event_type_id uuid REFERENCES event_types(id),
  creator_id uuid REFERENCES users(id),
  status event_status_enum DEFAULT 'planned',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Создание таблицы event_participants
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

-- 8. Создание таблицы tests
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type test_type_enum NOT NULL,
  passing_score integer DEFAULT 0,
  time_limit integer DEFAULT 0,
  event_type_id uuid REFERENCES event_types(id),
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. Создание таблицы test_questions
CREATE TABLE IF NOT EXISTS test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type question_type_enum NOT NULL,
  "order" integer DEFAULT 0,
  points integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  correct_order integer
);

-- 10. Создание таблицы test_answers
CREATE TABLE IF NOT EXISTS test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_correct boolean DEFAULT false,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. Создание таблицы user_test_attempts
CREATE TABLE IF NOT EXISTS user_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  test_id uuid NOT NULL REFERENCES tests(id),
  score integer DEFAULT 0,
  max_score integer DEFAULT 0,
  answers jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. Создание таблицы event_files
CREATE TABLE IF NOT EXISTS event_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('presentation', 'workbook')),
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS event_participants_event_id_idx ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS event_participants_user_id_idx ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS event_participants_user_id_attended_idx ON event_participants(user_id, attended);
CREATE INDEX IF NOT EXISTS idx_event_files_event_id ON event_files(event_id);
CREATE INDEX IF NOT EXISTS idx_event_files_file_type ON event_files(file_type);
CREATE INDEX IF NOT EXISTS user_test_attempts_user_id_idx ON user_test_attempts(user_id);
CREATE INDEX IF NOT EXISTS user_test_attempts_test_id_idx ON user_test_attempts(test_id);

-- Включение RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

SELECT 'Структура базы данных создана успешно' as status;


