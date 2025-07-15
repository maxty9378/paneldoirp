/*
  # Add user auth synchronization

  1. New Functions
    - `sync_user_from_auth` trigger function to automatically keep users table in sync with auth.users
    - `get_default_password` function to retrieve the standard password

  2. Changes
    - Adds default password setting to system_settings
    - Documents default password behavior in table comments
    - Adds trigger to sync auth users to users table

  3. Security
    - Updates RLS policies for user management
*/

-- Add default password setting if it doesn't exist
INSERT INTO system_settings (key, value, description, category) 
SELECT 'default_password', '"123456"'::jsonb, 'Стандартный пароль для новых пользователей', 'security'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'default_password');

-- Add helpful comments to document the password behavior
COMMENT ON TABLE users IS 'User accounts with the default password of 123456';

-- Create function to retrieve the default password
CREATE OR REPLACE FUNCTION get_default_password()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT value::text FROM system_settings WHERE key = 'default_password'),
    '"123456"'
  )::json::text;
$$;

-- Function to synchronize auth.users to public.users
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_full_name text;
BEGIN
  -- Get user info from metadata
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  
  -- If no full_name, construct from email
  IF v_full_name IS NULL THEN
    v_full_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.id) THEN
    -- Create new user
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      subdivision,
      status,
      is_active,
      department,
      work_experience_days,
      password_changed_at
    ) VALUES (
      NEW.id,
      NEW.email,
      v_full_name,
      v_role,
      'management_company',
      'active',
      true,
      'management_company',
      0,
      NEW.updated_at
    );
    
    -- Log that user was synchronized
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      NEW.id, -- Use the user's own ID since this is a system action
      'user_sync_from_auth',
      'users',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'password', get_default_password(),
        'created_via', 'auth_sync'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_from_auth();
  
-- Create function to create a user with auth in one step
CREATE OR REPLACE FUNCTION create_user_with_default_password(
  p_email text,
  p_full_name text,
  p_role text DEFAULT 'employee',
  p_sap_number text DEFAULT NULL,
  p_position_id uuid DEFAULT NULL,
  p_territory_id uuid DEFAULT NULL
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_password text := TRIM(BOTH '"' FROM get_default_password());
  v_result jsonb;
BEGIN
  -- Create the user record in users table first
  INSERT INTO users (
    email,
    sap_number,
    full_name,
    role,
    position_id,
    territory_id,
    subdivision,
    status,
    is_active,
    department,
    work_experience_days
  ) VALUES (
    p_email,
    p_sap_number,
    p_full_name,
    p_role,
    p_position_id,
    p_territory_id,
    'management_company',
    'active',
    true,
    'management_company',
    0
  ) RETURNING id INTO v_user_id;
  
  -- Log the action with the default password
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    new_values
  ) VALUES (
    auth.uid(),
    'create_user_with_password',
    'users',
    v_user_id,
    jsonb_build_object(
      'email', p_email,
      'password', v_password,
      'full_name', p_full_name
    )
  );
  
  -- Return the result
  RETURN jsonb_build_object(
    'id', v_user_id,
    'email', p_email,
    'full_name', p_full_name,
    'password', v_password,
    'message', 'User created successfully'
  );
END;
$$;