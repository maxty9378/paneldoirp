-- Восстановление политик безопасности (RLS)
-- Выполните этот скрипт после restore_questions_answers.sql

-- 1. Политики для таблицы users
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Administrators can view all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Administrators can manage all users" ON users;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Administrators can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Administrators can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

-- 2. Политики для таблицы events
DROP POLICY IF EXISTS "Users can view events they participate in" ON events;
DROP POLICY IF EXISTS "Event creators can manage their events" ON events;
DROP POLICY IF EXISTS "Administrators can manage all events" ON events;

CREATE POLICY "Users can view events they participate in"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = events.id
      AND user_id = auth.uid()
    ) OR
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = ANY(ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum])
    )
  );

CREATE POLICY "Event creators can manage their events"
  ON events FOR ALL
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Administrators can manage all events"
  ON events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

-- 3. Политики для таблицы event_participants
DROP POLICY IF EXISTS "Users can view their own participations" ON event_participants;
DROP POLICY IF EXISTS "Event creators can manage participants" ON event_participants;
DROP POLICY IF EXISTS "Administrators can manage all participants" ON event_participants;

CREATE POLICY "Users can view their own participations"
  ON event_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Event creators can manage participants"
  ON event_participants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_participants.event_id
      AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Administrators can manage all participants"
  ON event_participants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

-- 4. Политики для таблицы tests
DROP POLICY IF EXISTS "All authenticated users can view tests" ON tests;
DROP POLICY IF EXISTS "Administrators can manage tests" ON tests;

CREATE POLICY "All authenticated users can view tests"
  ON tests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage tests"
  ON tests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

-- 5. Политики для таблицы test_questions
DROP POLICY IF EXISTS "All authenticated users can view test questions" ON test_questions;
DROP POLICY IF EXISTS "Administrators can manage test questions" ON test_questions;

CREATE POLICY "All authenticated users can view test questions"
  ON test_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage test questions"
  ON test_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

-- 6. Политики для таблицы test_answers
DROP POLICY IF EXISTS "All authenticated users can view test answers" ON test_answers;
DROP POLICY IF EXISTS "Administrators can manage test answers" ON test_answers;

CREATE POLICY "All authenticated users can view test answers"
  ON test_answers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage test answers"
  ON test_answers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

-- 7. Политики для таблицы user_test_attempts
DROP POLICY IF EXISTS "Users can view their own test attempts" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can create their own test attempts" ON user_test_attempts;
DROP POLICY IF EXISTS "Administrators can view all test attempts" ON user_test_attempts;

CREATE POLICY "Users can view their own test attempts"
  ON user_test_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own test attempts"
  ON user_test_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Administrators can view all test attempts"
  ON user_test_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

-- 8. Политики для таблицы event_files
DROP POLICY IF EXISTS "event_files_manage_policy" ON event_files;
DROP POLICY IF EXISTS "event_files_read_policy" ON event_files;

CREATE POLICY "event_files_manage_policy"
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
          AND role = 'administrator'::user_role_enum
        )
      )
    )
  );

CREATE POLICY "event_files_read_policy"
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
          WHERE event_id = event_files.event_id
          AND user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
          AND role = ANY(ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum])
        )
      )
    )
  );

-- 9. Политики для таблицы positions
DROP POLICY IF EXISTS "All authenticated users can view positions" ON positions;
DROP POLICY IF EXISTS "Administrators can manage positions" ON positions;

CREATE POLICY "All authenticated users can view positions"
  ON positions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage positions"
  ON positions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

-- 10. Политики для таблицы territories
DROP POLICY IF EXISTS "All authenticated users can view territories" ON territories;
DROP POLICY IF EXISTS "Administrators can manage territories" ON territories;

CREATE POLICY "All authenticated users can view territories"
  ON territories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage territories"
  ON territories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

-- 11. Политики для таблицы event_types
DROP POLICY IF EXISTS "All authenticated users can view event types" ON event_types;
DROP POLICY IF EXISTS "Administrators can manage event types" ON event_types;

CREATE POLICY "All authenticated users can view event types"
  ON event_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage event types"
  ON event_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'administrator'::user_role_enum
    )
  );

SELECT 'Политики безопасности восстановлены успешно' as status;


