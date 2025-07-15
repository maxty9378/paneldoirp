/*
  # Enhanced User Management

  1. New Functions
    - `create_user_with_auth`: Creates a user in both auth and public tables in one transaction
    - `update_user_auth`: Updates a user in both auth and public tables

  2. Auth Synchronization
    - Improved sync_user_from_auth function to properly handle auth.users to public.users sync
    - Added reliable auth trigger for new signups

  3. Security
    - Added secure password handling with custom encryption
    - Added permissions checks for administrative functions
*/

-- 1. Enhanced function to create a user in both auth and public tables
CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text DEFAULT 'employee',
  p_sap_number text DEFAULT NULL,
  p_position_id uuid DEFAULT NULL,
  p_territory_id uuid DEFAULT NULL,
  p_is_email_confirmed boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_instance_id uuid;
  v_result jsonb;
BEGIN
  -- Only administrators can create users
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to create users';
  END IF;

  -- Get the auth instance ID
  SELECT instance_id INTO v_instance_id
  FROM auth.instances
  LIMIT 1;

  -- Begin transaction
  BEGIN
    -- Create the user in auth.users
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
      v_instance_id,
      v_user_id,
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      CASE WHEN p_is_email_confirmed THEN NOW() ELSE NULL END,
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object(
        'full_name', p_full_name,
        'role', p_role
      ),
      NOW(),
      NOW()
    );

    -- Add user identity
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      p_email,
      v_user_id,
      jsonb_build_object('sub', v_user_id, 'email', p_email),
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    -- Create user in public.users table
    INSERT INTO users (
      id,
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
      work_experience_days,
      password_changed_at
    ) VALUES (
      v_user_id,
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
      0,
      NOW()
    );

    -- Log the action
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      auth.uid(),
      'create_user_with_auth',
      'users',
      v_user_id,
      jsonb_build_object(
        'email', p_email,
        'full_name', p_full_name,
        'role', p_role,
        'password', '********'
      )
    );
    
    -- Prepare result
    v_result := jsonb_build_object(
      'id', v_user_id,
      'email', p_email,
      'full_name', p_full_name,
      'role', p_role,
      'password', p_password,
      'message', 'User created successfully in both auth and public schema'
    );
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Handle errors and rollback automatically
      RAISE;
  END;
END;
$$;

-- 2. Enhanced function to update a user in both auth and public tables
CREATE OR REPLACE FUNCTION update_user_auth(
  p_user_id uuid,
  p_email text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_password text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_email text;
  v_result jsonb;
  v_user_exists boolean;
  v_auth_user_exists boolean;
BEGIN
  -- Only administrators can update users
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to update users';
  END IF;

  -- Check if user exists in public.users
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User not found in public schema';
  END IF;

  -- Get the old email
  SELECT email INTO v_old_email
  FROM users
  WHERE id = p_user_id;

  -- Check if user exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO v_auth_user_exists;

  -- Begin transaction
  BEGIN
    -- Update user in auth.users if exists
    IF v_auth_user_exists THEN
      -- Update email if changed
      IF p_email IS NOT NULL AND p_email <> v_old_email THEN
        UPDATE auth.users
        SET email = p_email,
            updated_at = NOW(),
            raw_user_meta_data = jsonb_set(
              COALESCE(raw_user_meta_data, '{}'::jsonb),
              '{email}',
              to_jsonb(p_email)
            )
        WHERE id = p_user_id;
        
        -- Update identity
        UPDATE auth.identities
        SET provider_id = p_email,
            identity_data = jsonb_set(
              identity_data,
              '{email}',
              to_jsonb(p_email)
            ),
            updated_at = NOW()
        WHERE user_id = p_user_id;
      END IF;

      -- Update user metadata
      IF p_full_name IS NOT NULL OR p_role IS NOT NULL THEN
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
              'full_name', COALESCE(p_full_name, raw_user_meta_data->>'full_name'),
              'role', COALESCE(p_role, raw_user_meta_data->>'role')
            ),
            updated_at = NOW()
        WHERE id = p_user_id;
      END IF;

      -- Update password if provided
      IF p_password IS NOT NULL THEN
        UPDATE auth.users
        SET encrypted_password = crypt(p_password, gen_salt('bf')),
            updated_at = NOW()
        WHERE id = p_user_id;
      END IF;
    END IF;

    -- Update user in public.users
    UPDATE users
    SET 
      email = COALESCE(p_email, email),
      full_name = COALESCE(p_full_name, full_name),
      role = COALESCE(p_role, role),
      is_active = COALESCE(p_is_active, is_active),
      updated_at = NOW()
    WHERE id = p_user_id;

    -- Log the action
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      auth.uid(),
      'update_user_auth',
      'users',
      p_user_id,
      jsonb_build_object(
        'email', p_email,
        'full_name', p_full_name,
        'role', p_role,
        'password_changed', p_password IS NOT NULL,
        'is_active', p_is_active
      )
    );
    
    -- Prepare result
    v_result := jsonb_build_object(
      'id', p_user_id,
      'email', COALESCE(p_email, v_old_email),
      'message', 'User updated successfully'
    );
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Handle errors and rollback automatically
      RAISE;
  END;
END;
$$;

-- 3. Enhanced synchronization function for auth.users to public.users
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_full_name text;
  v_user_exists boolean;
BEGIN
  -- Get user info from metadata
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  
  -- If no full_name, construct from email
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  -- Check if user already exists in public.users
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = NEW.id
  ) INTO v_user_exists;
  
  -- Create or update user record
  IF v_user_exists THEN
    -- Update existing user
    UPDATE users 
    SET
      email = COALESCE(users.email, NEW.email),
      full_name = COALESCE(users.full_name, v_full_name),
      role = COALESCE(users.role, v_role),
      updated_at = NOW()
    WHERE id = NEW.id;
  ELSE
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
      created_at,
      updated_at
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
      NEW.created_at,
      NEW.updated_at
    );
    
    -- Log synchronization
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      NEW.id, -- User's own ID as admin_id for system action
      'sync_from_auth',
      'users',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'full_name', v_full_name,
        'role', v_role,
        'created_at', NEW.created_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Make sure the trigger is created correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_from_auth();

-- Add reliable function to delete a user from both tables
CREATE OR REPLACE FUNCTION delete_user_with_auth(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_data jsonb;
  v_auth_exists boolean;
BEGIN
  -- Only administrators can delete users
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to delete users';
  END IF;

  -- Get user data for logging
  SELECT row_to_json(u)::jsonb INTO v_user_data
  FROM users u
  WHERE id = p_user_id;
  
  -- Check if user exists in auth
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO v_auth_exists;

  -- Begin transaction
  BEGIN
    -- Delete from public.users first (this ensures if there's an FK constraint,
    -- we fail early before touching auth)
    DELETE FROM users WHERE id = p_user_id;
    
    -- Delete from auth if exists
    IF v_auth_exists THEN
      DELETE FROM auth.users WHERE id = p_user_id;
    END IF;

    -- Log the action
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      old_values
    ) VALUES (
      auth.uid(),
      'delete_user_with_auth',
      'users',
      p_user_id,
      v_user_data
    );
    
    RETURN true;
  EXCEPTION
    WHEN OTHERS THEN
      -- Handle errors and rollback automatically
      RAISE;
  END;
END;
$$;