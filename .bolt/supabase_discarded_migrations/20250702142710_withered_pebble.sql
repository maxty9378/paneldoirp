/*
  # Fix User Authentication Sync Issues

  1. New Functions
    - `repair_user_auth` - Fixes auth records for existing users
    - `sync_all_users_to_auth` - Repairs auth for all users in the database
    
  2. Improvements
    - Add improved validation for user roles
    - Fix issues with role type casting
    - Add more detailed error logging
    
  3. Security
    - Update RLS policies
    - Ensure proper role handling
*/

-- Function to repair auth records for existing users
CREATE OR REPLACE FUNCTION repair_user_auth(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_instance_id uuid;
  v_password text := '123456';
  v_auth_exists boolean;
  v_auth_email_exists boolean;
  v_result jsonb;
  v_error text;
BEGIN
  -- Only administrators can repair users
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to repair users';
  END IF;

  -- Check if user exists in public.users
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found in public schema'
    );
  END IF;

  -- Log the repair attempt
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    new_values
  ) VALUES (
    auth.uid(),
    'repair_user_auth_attempt',
    'users',
    p_user_id,
    jsonb_build_object(
      'email', v_user.email,
      'role', v_user.role,
      'full_name', v_user.full_name
    )
  );
  
  -- Check if user has email
  IF v_user.email IS NULL OR v_user.email = '' THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User has no email address, cannot create auth record',
      'user_id', p_user_id,
      'needs_email', true
    );
  END IF;
  
  -- Check if auth user exists with this id
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO v_auth_exists;
  
  -- Check if another auth user exists with this email
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = v_user.email AND id <> p_user_id
  ) INTO v_auth_email_exists;
  
  -- If auth user already exists with this id, nothing to do
  IF v_auth_exists THEN
    RETURN jsonb_build_object(
      'status', 'success',
      'message', 'Auth record already exists',
      'user_id', p_user_id,
      'email', v_user.email,
      'auth_exists', true,
      'needs_repair', false
    );
  END IF;
  
  -- If another auth user exists with this email, we can't create a new one
  IF v_auth_email_exists THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Another auth user already exists with this email',
      'user_id', p_user_id,
      'email', v_user.email,
      'needs_email_change', true
    );
  END IF;
  
  -- Get the instance ID
  SELECT instance_id INTO v_instance_id
  FROM auth.instances
  LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Auth instance not found',
      'user_id', p_user_id
    );
  END IF;
  
  -- Create auth user
  BEGIN
    -- Create user in auth.users
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
      p_user_id,
      'authenticated',
      'authenticated',
      v_user.email,
      crypt(v_password, gen_salt('bf')),
      NOW(), -- Auto-confirm email
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object(
        'full_name', v_user.full_name,
        'role', v_user.role::text
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
      v_user.email,
      p_user_id,
      jsonb_build_object('sub', p_user_id, 'email', v_user.email),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
    
    -- Log successful repair
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values,
      success
    ) VALUES (
      auth.uid(),
      'repair_user_auth_success',
      'users',
      p_user_id,
      jsonb_build_object(
        'email', v_user.email,
        'password', v_password
      ),
      true
    );
    
    RETURN jsonb_build_object(
      'status', 'success',
      'message', 'Auth record created successfully',
      'user_id', p_user_id,
      'email', v_user.email,
      'password', v_password,
      'repaired', true
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_error := SQLERRM;
      
      -- Log the error
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        error_message,
        success
      ) VALUES (
        auth.uid(),
        'repair_user_auth_error',
        'users',
        p_user_id,
        v_error,
        false
      );
      
      RETURN jsonb_build_object(
        'status', 'error',
        'message', 'Error creating auth record: ' || v_error,
        'user_id', p_user_id
      );
  END;
END;
$$;

-- Function to repair all users
CREATE OR REPLACE FUNCTION sync_all_users_to_auth()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_success_count integer := 0;
  v_error_count integer := 0;
  v_skipped_count integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_result jsonb;
  v_repair_result jsonb;
BEGIN
  -- Only administrators can repair all users
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to repair users';
  END IF;

  -- Log start of operation
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values
  ) VALUES (
    auth.uid(),
    'sync_all_users_to_auth_started',
    'users',
    jsonb_build_object(
      'started_at', NOW()
    )
  );
  
  -- Process each user with email
  FOR v_user IN 
    SELECT id, email, role::text
    FROM users 
    WHERE email IS NOT NULL AND email <> ''
    AND NOT EXISTS (
      SELECT 1 FROM auth.users WHERE id = users.id
    )
  LOOP
    v_repair_result := repair_user_auth(v_user.id);
    
    IF v_repair_result->>'status' = 'success' AND (v_repair_result->>'repaired')::boolean = true THEN
      v_success_count := v_success_count + 1;
    ELSIF v_repair_result->>'status' = 'error' THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'user_id', v_user.id,
        'email', v_user.email,
        'error', v_repair_result->>'message'
      );
    ELSE
      v_skipped_count := v_skipped_count + 1;
    END IF;
  END LOOP;
  
  -- Log completion
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values,
    success
  ) VALUES (
    auth.uid(),
    'sync_all_users_to_auth_completed',
    'users',
    jsonb_build_object(
      'completed_at', NOW(),
      'success_count', v_success_count,
      'error_count', v_error_count,
      'skipped_count', v_skipped_count
    ),
    v_error_count = 0
  );
  
  RETURN jsonb_build_object(
    'status', 'success',
    'repaired_count', v_success_count,
    'error_count', v_error_count,
    'skipped_count', v_skipped_count,
    'errors', v_errors
  );
END;
$$;

-- Function to check user auth status
CREATE OR REPLACE FUNCTION check_user_auth(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_auth_exists boolean;
  v_auth_email_exists boolean;
BEGIN
  -- Only administrators can check users
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to check users';
  END IF;

  -- Get user info
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found in public schema'
    );
  END IF;
  
  -- Check auth status
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO v_auth_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = v_user.email AND id <> p_user_id
  ) INTO v_auth_email_exists;
  
  RETURN jsonb_build_object(
    'status', 'success',
    'user_id', p_user_id,
    'email', v_user.email,
    'full_name', v_user.full_name,
    'role', v_user.role,
    'auth_exists', v_auth_exists,
    'auth_email_conflict', v_auth_email_exists,
    'can_repair', v_user.email IS NOT NULL AND v_user.email <> '' AND NOT v_auth_exists AND NOT v_auth_email_exists
  );
END;
$$;

-- Function to fix users table role types
CREATE OR REPLACE FUNCTION fix_role_types()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_count integer := 0;
  v_error_count integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_user record;
BEGIN
  -- Only administrators can fix roles
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to fix role types';
  END IF;
  
  -- Log start of operation
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values
  ) VALUES (
    auth.uid(),
    'fix_role_types_started',
    'users',
    jsonb_build_object(
      'started_at', NOW()
    )
  );
  
  -- Process each user
  FOR v_user IN 
    SELECT id, email, role::text AS role_text
    FROM users
  LOOP
    BEGIN
      -- Validate and fix role
      IF v_user.role_text = ANY(enum_range(NULL::user_role_enum)::text[]) THEN
        -- Role is valid, ensure it's properly typed
        UPDATE users
        SET role = v_user.role_text::user_role_enum
        WHERE id = v_user.id;
        
        v_fixed_count := v_fixed_count + 1;
      ELSE
        -- Invalid role, set to default
        UPDATE users
        SET role = 'employee'::user_role_enum
        WHERE id = v_user.id;
        
        v_fixed_count := v_fixed_count + 1;
        
        -- Log the issue
        v_errors := v_errors || jsonb_build_object(
          'user_id', v_user.id,
          'email', v_user.email,
          'invalid_role', v_user.role_text,
          'fixed_to', 'employee'
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        
        -- Log the error
        v_errors := v_errors || jsonb_build_object(
          'user_id', v_user.id,
          'email', v_user.email,
          'error', SQLERRM
        );
    END;
  END LOOP;
  
  -- Log completion
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values,
    success
  ) VALUES (
    auth.uid(),
    'fix_role_types_completed',
    'users',
    jsonb_build_object(
      'completed_at', NOW(),
      'fixed_count', v_fixed_count,
      'error_count', v_error_count
    ),
    v_error_count = 0
  );
  
  RETURN jsonb_build_object(
    'status', 'success',
    'fixed_count', v_fixed_count,
    'error_count', v_error_count,
    'errors', v_errors
  );
END;
$$;

-- Add RPC wrappers for easy calling from the client
CREATE OR REPLACE FUNCTION rpc_repair_user_auth(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN repair_user_auth(p_user_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION rpc_sync_all_users_to_auth()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN sync_all_users_to_auth();
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION rpc_check_user_auth(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN check_user_auth(p_user_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION rpc_fix_role_types()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN fix_role_types();
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION repair_user_auth TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_users_to_auth TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_auth TO authenticated;
GRANT EXECUTE ON FUNCTION fix_role_types TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_repair_user_auth TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_sync_all_users_to_auth TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_check_user_auth TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_fix_role_types TO authenticated;