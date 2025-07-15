/*
  # Улучшение видимости участников мероприятия

  1. Обновление RLS политик
    - Проверка и обновление существующих RLS политик для таблицы event_participants
    - Добавление политик UPDATE и DELETE для тренеров и администраторов
  
  2. Безопасность
    - Включение RLS для таблицы event_participants (если не включено)
    - Создание политик для всех типов операций (SELECT, INSERT, UPDATE, DELETE)
*/

-- Убедимся, что RLS включен для таблицы event_participants
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Обновление политики SELECT для участников мероприятий
DROP POLICY IF EXISTS "Allow all users to read event_participants" ON event_participants;
CREATE POLICY "Allow all users to read event_participants"
  ON event_participants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Обновление политики INSERT для тренеров и администраторов
DROP POLICY IF EXISTS "Users can add event participants" ON event_participants;
CREATE POLICY "Users can add event participants"
  ON event_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('trainer', 'expert', 'moderator', 'administrator')
    )
  );

-- Добавление политики UPDATE для тренеров и администраторов
DROP POLICY IF EXISTS "Users can update event participants" ON event_participants;
CREATE POLICY "Users can update event participants"
  ON event_participants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('trainer', 'expert', 'moderator', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('trainer', 'expert', 'moderator', 'administrator')
    )
  );

-- Добавление политики DELETE для тренеров и администраторов
DROP POLICY IF EXISTS "Users can delete event participants" ON event_participants;
CREATE POLICY "Users can delete event participants"
  ON event_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('trainer', 'expert', 'moderator', 'administrator')
    )
  );