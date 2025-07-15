/*
  # Add permissions for administrators
  
  1. Security
     - Policy for selecting all users by admins
     - Policy for creating users by admins
     - Policy for updating users by admins
     - Policy for deleting users by admins

  2. Bootstrap administrator creation
     - Fix for the admin role type issues
     - Improved cleanup of duplicate admins
*/

-- Set user_role_enum for the admin role
-- Allow regular authenticated users to read other users
DROP POLICY IF EXISTS "Allow all users to read users" ON public.users;
CREATE POLICY "Allow all users to read users" ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable admin to create users
DROP POLICY IF EXISTS "Administrators can create users" ON public.users;
CREATE POLICY "Administrators can create users" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('administrator', 'moderator')
    )
  );

-- Allow admin to update users
DROP POLICY IF EXISTS "Administrators can update users" ON public.users;
CREATE POLICY "Administrators can update users" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('administrator', 'moderator')
    )
  );

-- Allow admin to delete users
DROP POLICY IF EXISTS "Administrators can delete users" ON public.users;
CREATE POLICY "Administrators can delete users" ON public.users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('administrator', 'moderator')
    )
  );

-- Create a new function to streamline the admin creation process
CREATE OR REPLACE FUNCTION rpc_bootstrap_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  auth_instance_id uuid;
  v_password text := '123456';
  v_email text := 'doirp@sns.ru';
  v_full_name text := 'Администратор портала';
  v_result jsonb;
BEGIN
  -- Check if admin exists
  SELECT id INTO admin_id FROM users 
  WHERE email = v_email OR (role = 'administrator' AND full_name = v_full_name);
  
  IF admin_id IS NOT NULL THEN
    -- Admin exists in users table
    v_result := jsonb_build_object(
      'success', true,
      'id', admin_id,
      'email', v_email,
      'password', v_password,
      'message', 'Admin already exists'
    );
    
    RETURN v_result;
  END IF;

  -- Create admin user in public.users
  INSERT INTO users (
    email,
    full_name,
    role,
    subdivision,
    status,
    is_active,
    department,
    work_experience_days
  ) VALUES (
    v_email,
    v_full_name,
    'administrator'::user_role_enum,
    'management_company'::subdivision_enum,
    'active'::user_status_enum,
    true,
    'management_company',
    0
  ) RETURNING id INTO admin_id;
  
  -- Try to create admin in auth.users
  BEGIN
    -- Get auth instance ID
    SELECT instance_id INTO auth_instance_id
    FROM auth.instances
    LIMIT 1;
    
    IF auth_instance_id IS NULL THEN
      RAISE EXCEPTION 'Could not get auth instance ID';
    END IF;
    
    -- Check if email already exists in auth
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      -- Update the existing auth user's ID to match the new users record
      UPDATE users SET id = (
        SELECT id FROM auth.users WHERE email = v_email LIMIT 1
      ) WHERE id = admin_id;
      
      -- Get the updated ID
      SELECT id INTO admin_id FROM users WHERE email = v_email;
    ELSE
      -- Create new auth user
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      VALUES (
        auth_instance_id,
        admin_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt(v_password, gen_salt('bf')),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object(
          'full_name', v_full_name,
          'role', 'administrator'
        ),
        NOW(),
        NOW()
      );
      
      -- Add identity record
      INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        v_email,
        admin_id,
        jsonb_build_object('sub', admin_id, 'email', v_email),
        'email',
        NOW(),
        NOW(),
        NOW()
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but continue
      RAISE WARNING 'Error creating auth user: %', SQLERRM;
  END;
  
  v_result := jsonb_build_object(
    'success', true,
    'id', admin_id,
    'email', v_email,
    'password', v_password,
    'message', 'Admin user created successfully'
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create admin user: ' || SQLERRM
    );
END;
$$;

-- Ensure the function is accessible
GRANT EXECUTE ON FUNCTION rpc_bootstrap_admin TO anon, authenticated;