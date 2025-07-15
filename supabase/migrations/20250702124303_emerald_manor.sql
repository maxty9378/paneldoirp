/*
  # Fix User Auth Creation Permissions

  1. Changes
    - Fix the permission checks in `create_user_with_auth` function
    - Modify the trigger function to have better error handling
    - Add a new RPC function for admins to create users with proper permissions
    - Create a view for easier debugging of auth state
    
  2. Security
    - Ensure proper RLS for the new functions
    - Maintain SECURITY DEFINER settings
*/

-- First, let's fix the permissions check in the create_user_with_auth function
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
  v_current_role text;
BEGIN
  -- Check if the calling user has administrator or moderator role
  -- Using a more reliable check that doesn't rely on RLS
  SELECT role INTO v_current_role
  FROM users
  WHERE id = auth.uid();
  
  IF v_current_role IS NULL OR v_current_role NOT IN ('administrator', 'moderator') THEN
    -- Log the permission issue for debugging
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      error_message,
      success
    ) VALUES (
      auth.uid(),
      'create_user_with_auth_permission_denied',
      'users',
      'User does not have administrator or moderator role: ' || COALESCE(v_current_role, 'NULL'),
      false
    );
    
    RAISE EXCEPTION 'Insufficient permissions to create users. Current role: %', COALESCE(v_current_role, 'NULL');
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
      new_values,
      success
    ) VALUES (
      auth.uid(),
      'create_user_with_auth',
      'users',
      v_user_id,
      jsonb_build_object(
        'email', p_email,
        'full_name', p_full_name,
        'role', p_role,
        'current_admin_role', v_current_role
      ),
      true
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
      -- Log the exception
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        error_message,
        success
      ) VALUES (
        auth.uid(),
        'create_user_with_auth_error',
        'users',
        SQLERRM,
        false
      );
      -- Re-raise the exception
      RAISE;
  END;
END;
$$;

-- Create a new RPC function that exposes this functionality safely
CREATE OR REPLACE FUNCTION rpc_create_user(
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
AS $$
DECLARE
  v_password text := '123456';
  v_result jsonb;
BEGIN
  -- Call the internal function
  v_result := create_user_with_auth(
    p_email,
    v_password,
    p_full_name,
    p_role,
    p_sap_number,
    p_position_id,
    p_territory_id
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'status', 'error'
    );
END;
$$;

-- Create a view to help debug auth state
CREATE OR REPLACE VIEW auth_users_debug AS
SELECT 
  a.id, 
  a.email,
  a.role as auth_role,
  a.email_confirmed_at,
  a.created_at as auth_created_at,
  a.updated_at as auth_updated_at,
  u.full_name,
  u.role as user_role,
  u.is_active,
  u.created_at as user_created_at,
  CASE 
    WHEN a.id IS NULL THEN 'Missing auth record'
    WHEN u.id IS NULL THEN 'Missing user record'
    ELSE 'Complete'
  END as status
FROM auth.users a
FULL OUTER JOIN users u ON a.id = u.id;

-- Grant access to the view for administrators
ALTER VIEW auth_users_debug OWNER TO postgres;
GRANT SELECT ON auth_users_debug TO service_role;

-- Improve the trigger function with better logging
CREATE OR REPLACE FUNCTION after_user_created_in_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password text := '123456';
  v_instance_id uuid;
  v_auth_created boolean := false;
  v_error text;
BEGIN
  -- Only attempt to create auth record if email is provided
  IF NEW.email IS NULL OR NEW.email = '' THEN
    -- Log the missing email
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values,
      success
    ) VALUES (
      COALESCE(auth.uid(), NEW.id),
      'trigger_skipped_no_email',
      'users',
      NEW.id,
      jsonb_build_object('sap_number', NEW.sap_number),
      true
    );
    RETURN NEW;
  END IF;
  
  -- Check if auth user already exists for this id
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
    -- Log that auth user already exists
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      success
    ) VALUES (
      COALESCE(auth.uid(), NEW.id),
      'trigger_skipped_auth_exists',
      'users',
      NEW.id,
      true
    );
    RETURN NEW;
  END IF;
  
  -- Check if auth user already exists with this email
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.email) THEN
    -- Log that email is already in use
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values,
      success
    ) VALUES (
      COALESCE(auth.uid(), NEW.id),
      'trigger_skipped_email_exists',
      'users',
      NEW.id,
      jsonb_build_object('email', NEW.email),
      true
    );
    RETURN NEW;
  END IF;
  
  -- Get the instance ID
  BEGIN
    SELECT instance_id INTO v_instance_id
    FROM auth.instances
    LIMIT 1;
    
    IF v_instance_id IS NULL THEN
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        error_message,
        success
      ) VALUES (
        COALESCE(auth.uid(), NEW.id),
        'trigger_no_instance_id',
        'users',
        NEW.id,
        'No auth instance found',
        false
      );
      RETURN NEW;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        error_message,
        success
      ) VALUES (
        COALESCE(auth.uid(), NEW.id),
        'trigger_instance_id_error',
        'users',
        NEW.id,
        SQLERRM,
        false
      );
      RETURN NEW;
  END;
  
  -- Try to create auth user
  BEGIN
    -- Create auth user
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
      NEW.id,
      'authenticated',
      'authenticated',
      NEW.email,
      crypt(v_password, gen_salt('bf')),
      NOW(), -- Auto-confirm email
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object(
        'full_name', NEW.full_name,
        'role', NEW.role
      ),
      NOW(),
      NOW()
    );
    
    v_auth_created := true;
    
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
      NEW.email,
      NEW.id,
      jsonb_build_object('sub', NEW.id, 'email', NEW.email),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
    
    -- Log successful creation
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values,
      success
    ) VALUES (
      COALESCE(auth.uid(), NEW.id),
      'trigger_auth_created',
      'auth.users',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'default_password', v_password
      ),
      true
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
        COALESCE(auth.uid(), NEW.id),
        'trigger_auth_creation_error',
        'auth.users',
        NEW.id,
        v_error,
        false
      );
  END;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS after_user_created ON users;
CREATE TRIGGER after_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION after_user_created_in_users();

-- Grant necessary permissions to the new function
GRANT EXECUTE ON FUNCTION rpc_create_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_with_auth TO authenticated;

-- Add a function to check and fix auth state
CREATE OR REPLACE FUNCTION check_user_auth_state(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user record;
  v_auth_exists boolean;
  v_result jsonb;
BEGIN
  -- Only administrators can call this function
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('administrator', 'moderator')
  ) THEN
    RETURN jsonb_build_object(
      'error', 'Insufficient permissions',
      'status', 'error'
    );
  END IF;
  
  -- Check if user exists in public.users
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'User not found in public schema',
      'status', 'error'
    );
  END IF;
  
  -- Check if user exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) INTO v_auth_exists;
  
  -- Return the state
  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'email', v_user.email,
    'full_name', v_user.full_name,
    'role', v_user.role,
    'auth_exists', v_auth_exists,
    'can_create_auth', v_user.email IS NOT NULL AND v_user.email != '' AND NOT v_auth_exists,
    'status', 'success'
  );
END;
$$;

-- Grant execute permissions for the check function
GRANT EXECUTE ON FUNCTION check_user_auth_state TO authenticated;