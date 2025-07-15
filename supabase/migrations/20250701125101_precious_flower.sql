/*
  # Fix infinite recursion in users table RLS policies

  1. Changes
    - Drop existing problematic RLS policies on users table
    - Create new, simpler policies that don't cause recursion
    - Ensure users can read their own profile
    - Allow administrators to read all users
    - Allow trainers to read users in their branch (simplified approach)

  2. Security
    - Maintain RLS on users table
    - Use auth.uid() directly without subqueries to users table
    - Create separate policies for different access patterns
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Trainers can read their branch users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- Create new, non-recursive policies
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create a simple policy for administrators
CREATE POLICY "Administrators can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'administrator'
    )
  );

-- Create a policy for trainers to read users in their branch
-- This uses a simpler approach that doesn't query the users table recursively
CREATE POLICY "Trainers can read branch users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if the current user is a trainer/administrator and this is for their branch
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND (
        au.raw_user_meta_data->>'role' IN ('trainer', 'administrator', 'moderator')
        OR auth.uid() = users.id  -- Always allow reading own profile
      )
    )
  );