/*
  # Fix event participants access and display

  1. Changes
    - Ensures proper RLS policies for event participants table
    - Makes sure trainers and experts can access participant data
    - Updates security settings for event participant management
    
  2. Security
    - Updates SELECT policy to ensure all authenticated users can view participants
    - Ensures proper INSERT, UPDATE, DELETE policies for trainers and administrators
*/

-- Make sure RLS is enabled for the table
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- Replace the SELECT policy to ensure visibility
DROP POLICY IF EXISTS "Allow all users to read event_participants" ON event_participants;
CREATE POLICY "Allow all users to read event_participants"
  ON event_participants
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure INSERT policy is correctly set for trainers and administrators
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

-- Ensure UPDATE policy is correctly set
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

-- Ensure DELETE policy is correctly set
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

-- Add indexes to improve performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'event_participants' AND indexname = 'event_participants_event_id_idx'
  ) THEN
    CREATE INDEX event_participants_event_id_idx ON event_participants (event_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'event_participants' AND indexname = 'event_participants_user_id_idx'
  ) THEN
    CREATE INDEX event_participants_user_id_idx ON event_participants (user_id);
  END IF;
END$$;