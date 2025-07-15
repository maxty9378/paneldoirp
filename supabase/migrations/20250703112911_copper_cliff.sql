/*
  # Add management policies for territories table

  1. Security
    - Add INSERT policy for administrators and moderators
    - Add UPDATE policy for administrators and moderators  
    - Add DELETE policy for administrators and moderators

  This allows proper management of territories through the admin interface.
*/

-- Allow administrators and moderators to create territories
CREATE POLICY "Administrators can create territories"
  ON territories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum])
    )
  );

-- Allow administrators and moderators to update territories
CREATE POLICY "Administrators can update territories"
  ON territories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum])
    )
  );

-- Allow administrators and moderators to delete territories
CREATE POLICY "Administrators can delete territories"
  ON territories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = ANY (ARRAY['administrator'::user_role_enum, 'moderator'::user_role_enum])
    )
  );