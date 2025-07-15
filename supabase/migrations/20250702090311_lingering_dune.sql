/*
  # Add UPDATE and DELETE policies for events table

  1. Security Policies
    - Add UPDATE policy for events table - allows creators and administrators to modify events
    - Add DELETE policy for events table - allows creators and administrators to delete events
    
  2. Changes
    - Users can update events they created (where auth.uid() = creator_id)
    - Users with elevated roles (trainer, expert, moderator, administrator) can update any events
    - Users can delete events they created (where auth.uid() = creator_id)
    - Users with elevated roles (trainer, expert, moderator, administrator) can delete any events
*/

-- Add UPDATE policy for events
CREATE POLICY "Users can update events they created or have elevated permissions"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('trainer', 'expert', 'moderator', 'administrator')
    )
  );

-- Add DELETE policy for events
CREATE POLICY "Users can delete events they created or have elevated permissions"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('trainer', 'expert', 'moderator', 'administrator')
    )
  );