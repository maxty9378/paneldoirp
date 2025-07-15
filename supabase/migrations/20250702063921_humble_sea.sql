/*
  # Fix RLS policies and add test events

  1. Security Changes
    - Drop existing policies to avoid conflicts
    - Recreate simple policies for all tables
    - Enable RLS on all tables

  2. Test Data
    - Add event types if they don't exist
    - Add test events with fixed dates
*/

-- Drop all existing policies to avoid conflicts
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop policies for events
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'events' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON events';
    END LOOP;
    
    -- Drop policies for event_participants
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'event_participants' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON event_participants';
    END LOOP;
    
    -- Drop policies for event_types
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'event_types' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON event_types';
    END LOOP;
    
    -- Drop policies for users
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
    END LOOP;
    
    -- Drop policies for positions
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'positions' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON positions';
    END LOOP;
    
    -- Drop policies for territories
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'territories' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON territories';
    END LOOP;
    
    -- Drop policies for branches
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'branches' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON branches';
    END LOOP;
    
    -- Drop policies for user_logs
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_logs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_logs';
    END LOOP;
    
    -- Drop policies for user_activity_logs
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_activity_logs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_activity_logs';
    END LOOP;
END $$;

-- Enable RLS on all tables
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create new simple policies for events
CREATE POLICY "events_select_policy"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "events_insert_policy"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "events_update_policy"
  ON events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "events_delete_policy"
  ON events
  FOR DELETE
  TO authenticated
  USING (true);

-- Create new simple policies for event_participants
CREATE POLICY "participants_select_policy"
  ON event_participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "participants_all_policy"
  ON event_participants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new simple policies for event_types
CREATE POLICY "event_types_select_policy"
  ON event_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Create new simple policies for users
CREATE POLICY "users_select_policy"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_update_policy"
  ON users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "users_insert_policy"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create new simple policies for positions
CREATE POLICY "positions_select_policy"
  ON positions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create new simple policies for territories
CREATE POLICY "territories_select_policy"
  ON territories
  FOR SELECT
  TO authenticated
  USING (true);

-- Create new simple policies for branches
CREATE POLICY "branches_select_policy"
  ON branches
  FOR SELECT
  TO authenticated
  USING (true);

-- Create new simple policies for user_logs
CREATE POLICY "user_logs_select_policy"
  ON user_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user_logs_insert_policy"
  ON user_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create new simple policies for user_activity_logs
CREATE POLICY "activity_logs_select_policy"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Check if event types exist and add them if they don't
DO $$
DECLARE
  event_types_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO event_types_count FROM event_types;
  
  IF event_types_count = 0 THEN
    INSERT INTO event_types (name, name_ru, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form)
    VALUES 
      ('online_training', 'Онлайн-тренинг', TRUE, FALSE, TRUE, TRUE, TRUE),
      ('in_person_training', 'Очный тренинг', FALSE, TRUE, TRUE, TRUE, TRUE),
      ('webinar', 'Вебинар', TRUE, FALSE, FALSE, FALSE, TRUE),
      ('exam', 'Экзамен', FALSE, TRUE, FALSE, TRUE, FALSE),
      ('conference', 'Конференция', FALSE, TRUE, FALSE, FALSE, TRUE),
      ('workshop', 'Воркшоп', FALSE, TRUE, FALSE, FALSE, TRUE);
      
    RAISE NOTICE 'Added default event types';
  END IF;
END $$;

-- Add test events with fixed dates
DO $$
DECLARE
  admin_id UUID;
  online_type_id UUID;
  in_person_type_id UUID;
  events_count INTEGER;
BEGIN
  -- Get admin ID
  SELECT id INTO admin_id FROM users WHERE email = 'doirp@sns.ru' LIMIT 1;
  
  -- Get event type IDs
  SELECT id INTO online_type_id FROM event_types WHERE name = 'online_training' LIMIT 1;
  SELECT id INTO in_person_type_id FROM event_types WHERE name = 'in_person_training' LIMIT 1;
  
  -- Check if test events already exist
  SELECT COUNT(*) INTO events_count FROM events WHERE title LIKE '%базовый курс%';
  
  IF admin_id IS NOT NULL AND events_count = 0 THEN
    -- First event
    INSERT INTO events (
      title, 
      description, 
      event_type_id, 
      creator_id, 
      start_date, 
      end_date, 
      status, 
      points, 
      location,
      max_participants,
      files
    )
    VALUES (
      'Продажи в розничной торговле - базовый курс',
      'Комплексное обучение основам продаж для новых сотрудников',
      online_type_id,
      admin_id,
      '2024-12-20T10:00:00Z',
      '2024-12-20T14:00:00Z',
      'active',
      50,
      'Онлайн, Zoom',
      30,
      '[]'::jsonb
    );
    
    -- Second event
    INSERT INTO events (
      title, 
      description, 
      event_type_id, 
      creator_id, 
      start_date, 
      end_date, 
      status, 
      points, 
      location,
      max_participants,
      files
    )
    VALUES (
      'Работа с возражениями клиентов',
      'Практический тренинг по технике работы с возражениями',
      in_person_type_id,
      admin_id,
      '2024-12-22T14:00:00Z',
      '2024-12-22T18:00:00Z',
      'active',
      75,
      'Конференц-зал, офис Москва',
      20,
      '[]'::jsonb
    );
    
    -- Third event (completed)
    INSERT INTO events (
      title, 
      description, 
      event_type_id, 
      creator_id, 
      start_date, 
      end_date, 
      status, 
      points, 
      location,
      max_participants,
      files
    )
    VALUES (
      'Введение в продукты компании',
      'Обзор основных продуктов и услуг компании для новых сотрудников',
      online_type_id,
      admin_id,
      '2024-11-15T09:00:00Z',
      '2024-11-15T12:00:00Z',
      'completed',
      30,
      'Онлайн, Teams',
      50,
      '[]'::jsonb
    );
    
    RAISE NOTICE 'Added test events';
  ELSE
    RAISE NOTICE 'Test events already exist or admin not found. Admin ID: %, Events count: %', admin_id, events_count;
  END IF;
END $$;