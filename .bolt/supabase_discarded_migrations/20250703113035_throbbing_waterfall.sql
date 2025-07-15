/*
  # Add admin policies for positions table

  1. Security Updates
    - Add INSERT policy for administrators and moderators to create positions
    - Add UPDATE policy for administrators and moderators to modify positions  
    - Add DELETE policy for administrators and moderators to remove positions

  2. Changes
    - Enables full CRUD operations for admin roles on positions table
    - Maintains existing SELECT policy for all authenticated users
    - Follows same pattern as territories table policies
*/

-- Add INSERT policy for administrators and moderators
CREATE POLICY "Administrators can create positions"
  ON positions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = uid() 
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
      WHERE users.id = uid() 
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
      WHERE users.id = uid() 
      AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum])
    )
  );