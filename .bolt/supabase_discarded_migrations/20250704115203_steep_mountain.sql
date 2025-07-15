/*
  # Fix admin_logs RLS policy

  1. Problem
    - Current INSERT policy for admin_logs is too restrictive
    - Triggers and system functions cannot insert logs due to RLS violations
    
  2. Solution
    - Update INSERT policy to allow system operations
    - Allow logging functions to work properly
    - Maintain security for direct user operations
*/

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create admin logs" ON admin_logs;

-- Create new, more permissive INSERT policy for admin_logs
CREATE POLICY "Allow admin logs creation"
  ON admin_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if admin_id is NULL (system operations) 
    -- OR admin_id matches current user
    -- OR user has elevated permissions
    (admin_id IS NULL) 
    OR (admin_id = uid()) 
    OR (EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = uid() 
      AND users.role = ANY (ARRAY[
        'administrator'::user_role_enum, 
        'moderator'::user_role_enum, 
        'trainer'::user_role_enum, 
        'expert'::user_role_enum
      ])
    ))
  );

-- Also ensure we have proper SELECT policy for admin_logs
DROP POLICY IF EXISTS "Administrators can view admin logs" ON admin_logs;

CREATE POLICY "Allow admin logs reading"
  ON admin_logs
  FOR SELECT
  TO authenticated
  USING (
    -- Allow administrators and moderators to view all logs
    -- Allow users to view logs where they are the admin_id
    (admin_id = uid())
    OR (EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = uid() 
      AND users.role = ANY (ARRAY[
        'administrator'::user_role_enum, 
        'moderator'::user_role_enum
      ])
    ))
  );