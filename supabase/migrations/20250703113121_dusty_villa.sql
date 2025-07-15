/*
  # Add positions table RLS policies
  
  1. Security
    - Enable RLS policies for administrators and moderators to manage positions
    - Allow authenticated users to read positions
*/

-- Add INSERT policy for administrators and moderators
CREATE POLICY "Administrators can create positions"
  ON positions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum])
    )
  );

-- Add UPDATE policy for administrators and moderators
CREATE POLICY "Administrators can update positions"
  ON positions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum])
    )
  );

-- Add DELETE policy for administrators and moderators
CREATE POLICY "Administrators can delete positions"
  ON positions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum])
    )
  );