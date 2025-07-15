/*
  # Add INSERT policy for events table

  1. Security
    - Add policy for authenticated users to create events where they are the creator
    - Allow users with elevated roles (trainer, expert, moderator, administrator) to create any events
  
  This fixes the RLS policy violation error when creating new events.
*/

-- Add policy for creating events
CREATE POLICY "Users can create events as creator"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('trainer', 'expert', 'moderator', 'administrator')
    )
  );