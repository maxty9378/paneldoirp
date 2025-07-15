/*
  # Fix RLS Policies

  1. New Approach
    - Drop all conflicting policies
    - Create new policies with unique names
    - Add simple policies for all tables
  2. Security
    - Enable RLS for all tables
    - Grant authenticated users appropriate permissions
  3. Default Data
    - Ensure event types exist
    - Add sample events if needed
*/

-- Полностью отключаем RLS для таблиц
ALTER TABLE IF EXISTS events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS territories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_activity_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop policies for events
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'events' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.events';
    END LOOP;
    
    -- Drop policies for event_participants
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'event_participants' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.event_participants';
    END LOOP;
    
    -- Drop policies for event_types
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'event_types' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.event_types';
    END LOOP;
    
    -- Drop policies for users
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
    
    -- Drop policies for positions
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'positions' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.positions';
    END LOOP;
    
    -- Drop policies for territories
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'territories' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.territories';
    END LOOP;
    
    -- Drop policies for branches
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'branches' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.branches';
    END LOOP;
    
    -- Drop policies for user_logs
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_logs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.user_logs';
    END LOOP;
    
    -- Drop policies for user_activity_logs
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_activity_logs' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.user_activity_logs';
    END LOOP;
END $$;

-- Включаем RLS обратно
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Создаем новые политики для events с уникальными названиями
CREATE POLICY "events_select_policy"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "events_insert_policy"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "events_update_policy"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "events_delete_policy"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (true);

-- Создаем новые политики для event_participants с уникальными названиями
CREATE POLICY "participants_select_policy"
  ON public.event_participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "participants_all_policy"
  ON public.event_participants
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создаем новые политики для event_types с уникальными названиями
CREATE POLICY "event_types_select_policy"
  ON public.event_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Создаем новые политики для users с уникальными названиями
CREATE POLICY "users_select_policy"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_update_policy"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "users_insert_policy"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Создаем новые политики для positions с уникальными названиями
CREATE POLICY "positions_select_policy"
  ON public.positions
  FOR SELECT
  TO authenticated
  USING (true);

-- Создаем новые политики для territories с уникальными названиями
CREATE POLICY "territories_select_policy"
  ON public.territories
  FOR SELECT
  TO authenticated
  USING (true);

-- Создаем новые политики для branches с уникальными названиями
CREATE POLICY "branches_select_policy"
  ON public.branches
  FOR SELECT
  TO authenticated
  USING (true);

-- Создаем новые политики для user_logs с уникальными названиями
CREATE POLICY "user_logs_select_policy"
  ON public.user_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "user_logs_insert_policy"
  ON public.user_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Создаем новые политики для user_activity_logs с уникальными названиями
CREATE POLICY "activity_logs_select_policy"
  ON public.user_activity_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Проверяем, есть ли уже типы мероприятий, и добавляем если нет
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
      
    RAISE NOTICE 'Добавлены типы мероприятий по умолчанию';
  END IF;
END $$;

-- Проверяем наличие тестового пользователя администратора
DO $$
DECLARE
  v_user_exists BOOLEAN;
  v_admin_id UUID;
  v_admin_auth_id UUID;
BEGIN
  -- Проверяем, существует ли админ
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'doirp@sns.ru'
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE NOTICE 'Создаем аккаунт администратора...';

    -- Проверяем, существует ли админ в auth.users
    SELECT id INTO v_admin_auth_id
    FROM auth.users
    WHERE email = 'doirp@sns.ru'
    LIMIT 1;

    IF v_admin_auth_id IS NULL THEN
      RAISE NOTICE 'Администратор не найден в auth.users. Он должен быть создан через API.';
    ELSE
      RAISE NOTICE 'Администратор найден в auth.users, создаем профиль в public.users...';

      -- Создаем профиль админа в public.users
      INSERT INTO users (
        id,
        email,
        full_name,
        role,
        subdivision,
        status,
        work_experience_days,
        position,
        is_active,
        department
      )
      VALUES (
        v_admin_auth_id,
        'doirp@sns.ru',
        'Администратор портала',
        'administrator',
        'management_company',
        'active',
        0,
        'Администратор системы',
        true,
        'management_company'
      )
      RETURNING id INTO v_admin_id;

      RAISE NOTICE 'Администратор создан с ID: %', v_admin_id;
    END IF;
  ELSE
    RAISE NOTICE 'Администратор уже существует, обновляем его роль...';
    
    -- Обновляем существующего админа, чтобы обеспечить правильную роль
    UPDATE users
    SET 
      role = 'administrator',
      is_active = true
    WHERE email = 'doirp@sns.ru';
    
    RAISE NOTICE 'Роль администратора установлена для doirp@sns.ru';
  END IF;
END $$;