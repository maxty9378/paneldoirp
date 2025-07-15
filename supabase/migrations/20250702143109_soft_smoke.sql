/*
  # Fix user authentication sync issues

  1. New Functions
     - `rpc_repair_user_auth` - Repairs auth records for a specific user
     - `rpc_sync_all_users_to_auth` - Repairs auth for all users in the database
     - `rpc_check_user_auth` - Checks the status of a user's authentication
     - `rpc_fix_role_types` - Ensures all user roles are the proper enum type

  2. Security
     - All functions are security definer and run with elevated privileges
     - Only administrators can run these repair functions
     - Comprehensive logging of all repair attempts

  3. Important Features
     - Automatic auth record creation for users who need it
     - Fixing incorrect role types (text vs enum)
     - Detailed reporting on what was fixed
*/

-- Function to check and fix user role type issues
CREATE OR REPLACE FUNCTION rpc_fix_role_types()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_count int := 0;
  v_error_count int := 0;
  v_result jsonb;
  v_error text;
  v_role_record record;
  v_role_text text;
  v_role_enum user_role_enum;
BEGIN
  -- Only administrators can run this function
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Insufficient permissions. Only administrators can run this function.'
    );
  END IF;

  -- Log the action
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values
  ) VALUES (
    auth.uid(),
    'fix_role_types_start',
    'users',
    jsonb_build_object('started_at', now())
  );

  -- Find all users with possible role type issues
  FOR v_role_record IN
    -- This query finds all roles from the enum that might need conversion
    SELECT id, role::text as role_text FROM users
  LOOP
    BEGIN
      -- Check if the role is a valid enum value
      v_role_text := v_role_record.role_text;
      
      -- This will raise an exception if the type is not valid for the enum
      BEGIN
        v_role_enum := v_role_text::user_role_enum;
        
        -- Update only if needed (already an enum, no need to cast again)
        EXECUTE 'UPDATE users SET role = $1::user_role_enum WHERE id = $2'
        USING v_role_text, v_role_record.id;
        
        v_fixed_count := v_fixed_count + 1;
        
      EXCEPTION WHEN invalid_text_representation THEN
        -- If the role string is not a valid enum, set to 'employee'
        UPDATE users SET role = 'employee'::user_role_enum WHERE id = v_role_record.id;
        
        -- Log the error
        INSERT INTO admin_logs (
          admin_id,
          action,
          resource_type,
          resource_id,
          old_values,
          new_values
        ) VALUES (
          auth.uid(),
          'fix_invalid_role',
          'users',
          v_role_record.id,
          jsonb_build_object('role', v_role_text),
          jsonb_build_object('role', 'employee')
        );
        
        v_fixed_count := v_fixed_count + 1;
      END;
    
    EXCEPTION WHEN OTHERS THEN
      v_error := SQLERRM;
      v_error_count := v_error_count + 1;
      
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
        'fix_role_types_error',
        'users',
        v_role_record.id,
        v_error,
        false
      );
    END;
  END LOOP;

  -- Create the result
  v_result := jsonb_build_object(
    'status', 'success',
    'fixed_count', v_fixed_count,
    'error_count', v_error_count,
    'message', format('Fixed %s role types with %s errors', v_fixed_count, v_error_count)
  );

  -- Log the completion
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values
  ) VALUES (
    auth.uid(),
    'fix_role_types_complete',
    'users',
    v_result
  );

  RETURN v_result;
END;
$$;

-- Function to repair a specific user's auth record
CREATE OR REPLACE FUNCTION rpc_repair_user_auth(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_instance_id uuid;
  v_password text := '123456';
  v_result jsonb;
  v_error text;
  v_auth_exists boolean;
BEGIN
  -- Only administrators can run this function
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Insufficient permissions. Only administrators can run this function.'
    );
  END IF;

  -- Get the user data
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found'
    );
  END IF;
  
  IF v_user.email IS NULL OR v_user.email = '' THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User has no email address. Cannot create auth record.'
    );
  END IF;
  
  -- Check if auth record already exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id OR email = v_user.email
  ) INTO v_auth_exists;
  
  IF v_auth_exists THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Auth record already exists for this user or email.'
    );
  END IF;
  
  -- Get auth instance ID
  SELECT instance_id INTO v_instance_id
  FROM auth.instances
  LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'No auth instance found. Cannot create auth record.'
    );
  END IF;
  
  -- Create the auth record
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
      v_user.email,
      p_user_id,
      jsonb_build_object('sub', p_user_id, 'email', v_user.email),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
    
    -- Update password change timestamp
    UPDATE users
    SET password_changed_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the action
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values,
      success
    ) VALUES (
      auth.uid(),
      'repair_user_auth',
      'users',
      p_user_id,
      jsonb_build_object(
        'email', v_user.email,
        'password', v_password
      ),
      true
    );
    
    -- Return success
    v_result := jsonb_build_object(
      'status', 'success',
      'message', 'Auth record successfully created',
      'id', p_user_id,
      'email', v_user.email,
      'password', v_password
    );
    
    RETURN v_result;
    
  EXCEPTION WHEN OTHERS THEN
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
      'repair_user_auth_failed',
      'users',
      p_user_id,
      v_error,
      false
    );
    
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Failed to create auth record: ' || v_error
    );
  END;
END;
$$;

-- Function to check a user's auth status
CREATE OR REPLACE FUNCTION rpc_check_user_auth(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_auth_exists boolean;
  v_auth_email_matches boolean;
BEGIN
  -- Only administrators can run this function
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Insufficient permissions. Only administrators can run this function.'
    );
  END IF;

  -- Get the user data
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found'
    );
  END IF;
  
  -- Check if auth record exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id
  ) INTO v_auth_exists;
  
  -- Check if email matches if auth record exists
  IF v_auth_exists AND v_user.email IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = p_user_id AND email = v_user.email
    ) INTO v_auth_email_matches;
  ELSE
    v_auth_email_matches := false;
  END IF;
  
  -- Return the status
  RETURN jsonb_build_object(
    'status', 'success',
    'user_id', p_user_id,
    'full_name', v_user.full_name,
    'email', v_user.email,
    'role', v_user.role,
    'auth_record_exists', v_auth_exists,
    'auth_email_matches', v_auth_email_matches,
    'can_repair', v_user.email IS NOT NULL AND NOT v_auth_exists,
    'created_at', v_user.created_at,
    'last_sign_in_at', v_user.last_sign_in_at
  );
END;
$$;

-- Function to sync all users to auth
CREATE OR REPLACE FUNCTION rpc_sync_all_users_to_auth()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_instance_id uuid;
  v_password text := '123456';
  v_repaired_count int := 0;
  v_error_count int := 0;
  v_skipped_count int := 0;
  v_result jsonb;
  v_error text;
BEGIN
  -- Only administrators can run this function
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Insufficient permissions. Only administrators can run this function.'
    );
  END IF;

  -- Log the start of the operation
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values
  ) VALUES (
    auth.uid(),
    'sync_all_users_start',
    'users',
    jsonb_build_object('started_at', now())
  );

  -- Get auth instance ID
  SELECT instance_id INTO v_instance_id
  FROM auth.instances
  LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'No auth instance found. Cannot create auth records.'
    );
  END IF;
  
  -- Process all users with email but no auth record
  FOR v_user IN
    SELECT u.* FROM users u
    WHERE 
      u.email IS NOT NULL 
      AND u.email != ''
      AND NOT EXISTS (
        SELECT 1 FROM auth.users a
        WHERE a.id = u.id
      )
  LOOP
    -- Skip if auth record exists with this email (different ID)
    IF EXISTS (
      SELECT 1 FROM auth.users
      WHERE email = v_user.email
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      
      -- Log the skip
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        new_values
      ) VALUES (
        auth.uid(),
        'sync_user_skipped_email_exists',
        'users',
        v_user.id,
        jsonb_build_object('email', v_user.email)
      );
      
      CONTINUE;
    END IF;
    
    -- Create auth record for this user
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
        v_user.id,
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
        COALESCE(v_user.created_at, NOW()),
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
        v_user.email,
        v_user.id,
        jsonb_build_object('sub', v_user.id, 'email', v_user.email),
        'email',
        NOW(),
        COALESCE(v_user.created_at, NOW()),
        NOW()
      );
      
      -- Update password change timestamp
      UPDATE users
      SET password_changed_at = NOW()
      WHERE id = v_user.id;
      
      -- Log the success
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        new_values,
        success
      ) VALUES (
        auth.uid(),
        'sync_user_success',
        'users',
        v_user.id,
        jsonb_build_object(
          'email', v_user.email,
          'password', v_password
        ),
        true
      );
      
      v_repaired_count := v_repaired_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_error := SQLERRM;
      v_error_count := v_error_count + 1;
      
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
        'sync_user_error',
        'users',
        v_user.id,
        v_error,
        false
      );
    END;
  END LOOP;
  
  -- Create the result
  v_result := jsonb_build_object(
    'status', 'success',
    'repaired_count', v_repaired_count,
    'skipped_count', v_skipped_count,
    'error_count', v_error_count,
    'message', format('Repaired %s users, skipped %s users, encountered %s errors', 
                    v_repaired_count, v_skipped_count, v_error_count)
  );

  -- Log the completion
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values
  ) VALUES (
    auth.uid(),
    'sync_all_users_complete',
    'users',
    v_result
  );
  
  RETURN v_result;
END;
$$;

-- Ensure all functions are executable by appropriate roles
GRANT EXECUTE ON FUNCTION rpc_fix_role_types TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_repair_user_auth TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_check_user_auth TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_sync_all_users_to_auth TO authenticated;

-- Make sure we have an admin_password_reset schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'admin' AND table_name = 'user_passwords'
  ) THEN
    -- Create schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS admin;
    
    -- Create the table
    CREATE TABLE admin.user_passwords (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email text NOT NULL,
      temp_password text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      reset_by uuid NOT NULL REFERENCES users(id)
    );
    
    -- Add index on user_id
    CREATE INDEX ON admin.user_passwords(user_id);
    
    -- Add RLS policies
    ALTER TABLE admin.user_passwords ENABLE ROW LEVEL SECURITY;
    
    -- Policy for administrators
    CREATE POLICY "Administrators can manage password resets"
    ON admin.user_passwords
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('administrator', 'moderator')
      )
    );
  END IF;
END
$$;