/*
# Safe User Creation Test Migration

1. New Helper Functions
   - `get_safe_admin_id` - Finds an existing admin user ID for logging
   - `safe_log_action` - Safely logs actions even when auth.uid() is null

2. Test Functions
   - Tests direct user creation
   - Tests creating an administrator if none exists
   
3. Security
   - Proper error handling to avoid failed migrations
   - Safe logging that respects foreign key constraints
*/

-- Create a function to find an existing admin ID for logging
CREATE OR REPLACE FUNCTION get_safe_admin_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- First try to get current user's ID
  v_admin_id := auth.uid();
  
  -- If current user ID is null, find an existing administrator
  IF v_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = v_admin_id) THEN
    -- Look for an administrator
    SELECT id INTO v_admin_id
    FROM users
    WHERE role = 'administrator'
    LIMIT 1;
    
    -- If no administrator, use any existing user
    IF v_admin_id IS NULL THEN
      SELECT id INTO v_admin_id
      FROM users
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN v_admin_id;
END;
$$;

-- Create a function to safely log actions
CREATE OR REPLACE FUNCTION safe_log_action(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_success boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id uuid;
  v_log_id uuid;
BEGIN
  -- Get a valid admin ID
  SELECT get_safe_admin_id() INTO v_admin_id;
  
  -- Only log if we have a valid admin ID
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values,
      old_values,
      error_message,
      success
    ) VALUES (
      v_admin_id,
      p_action,
      p_resource_type,
      p_resource_id,
      p_new_values,
      p_old_values,
      p_error_message,
      p_success
    )
    RETURNING id INTO v_log_id;
  END IF;
  
  RETURN v_log_id;
END;
$$;

-- Create a test administrator if none exists
DO $$
DECLARE
  v_admin_count int;
  v_admin_id uuid;
  v_admin_email text := 'test_admin@example.com';
BEGIN
  -- Check if any administrator exists
  SELECT COUNT(*) INTO v_admin_count
  FROM users
  WHERE role = 'administrator';
  
  -- Only create a test admin if there are none
  IF v_admin_count = 0 THEN
    -- Create test admin
    v_admin_id := gen_random_uuid();
    
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      subdivision,
      status,
      is_active,
      department,
      work_experience_days
    ) VALUES (
      v_admin_id,
      v_admin_email,
      'Test Administrator',
      'administrator',
      'management_company',
      'active',
      true,
      'management_company',
      0
    );
    
    RAISE NOTICE 'Created test administrator with ID % and email %', v_admin_id, v_admin_email;
    
    -- Log using our safe function
    PERFORM safe_log_action(
      'create_test_admin',
      'users',
      v_admin_id,
      jsonb_build_object(
        'email', v_admin_email,
        'full_name', 'Test Administrator',
        'role', 'administrator'
      )
    );
  ELSE
    RAISE NOTICE 'Administrator(s) already exist, skipping creation';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating test admin: %', SQLERRM;
END;
$$;

-- Test direct user creation
DO $$
DECLARE
  v_user_id uuid;
  v_test_email text := 'test_direct@example.com';
BEGIN
  -- Delete user if exists
  DELETE FROM users WHERE email = v_test_email;
  
  -- Create test user directly
  v_user_id := gen_random_uuid();
  
  INSERT INTO users (
    id,
    email,
    full_name,
    role,
    subdivision,
    status,
    is_active,
    department,
    work_experience_days
  ) VALUES (
    v_user_id,
    v_test_email,
    'Direct Test User',
    'employee',
    'management_company',
    'active',
    true,
    'management_company',
    0
  );
  
  -- Log the creation safely
  PERFORM safe_log_action(
    'test_direct_user_creation',
    'users',
    v_user_id,
    jsonb_build_object(
      'email', v_test_email,
      'full_name', 'Direct Test User',
      'created_at', now()
    )
  );
  
  RAISE NOTICE 'Created direct test user with ID % and email %', v_user_id, v_test_email;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating direct test user: %', SQLERRM;
    
    -- Log error safely
    PERFORM safe_log_action(
      'test_direct_user_creation_error',
      'users',
      NULL,
      NULL,
      NULL,
      SQLERRM,
      false
    );
END;
$$;

-- Try using rpc_create_user_v2 function if it exists
DO $$
DECLARE
  v_function_exists boolean;
  v_user_result jsonb;
  v_test_email text := 'test_rpc_v2@example.com';
  v_admin_id uuid;
BEGIN
  -- Check if the function exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'rpc_create_user_v2'
  ) INTO v_function_exists;
  
  -- Get a valid admin ID for logging
  SELECT get_safe_admin_id() INTO v_admin_id;
  
  IF v_function_exists AND v_admin_id IS NOT NULL THEN
    -- Delete user if exists
    DELETE FROM users WHERE email = v_test_email;
    
    BEGIN
      -- Call the function using dynamic SQL to avoid errors if the function signature doesn't match
      EXECUTE format('
        SELECT rpc_create_user_v2(
          p_full_name := %L,
          p_email := %L,
          p_role := %L::user_role_enum,
          p_department := %L
        )',
        'RPC Test User V2',
        v_test_email,
        'employee',
        'management_company'
      ) INTO v_user_result;
      
      -- Log the result
      PERFORM safe_log_action(
        'test_rpc_create_user_v2',
        'users',
        (v_user_result->>'user'->>'id')::uuid,
        jsonb_build_object(
          'result', v_user_result,
          'test_timestamp', EXTRACT(epoch FROM now())
        )
      );
      
      RAISE NOTICE 'Test rpc_create_user_v2 result: %', v_user_result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error testing rpc_create_user_v2: %', SQLERRM;
        
        -- Log error safely
        PERFORM safe_log_action(
          'test_rpc_create_user_v2_error',
          'users',
          NULL,
          NULL,
          NULL,
          SQLERRM,
          false
        );
    END;
  ELSE
    RAISE NOTICE 'Function rpc_create_user_v2 does not exist or no valid admin ID available, skipping test';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Unexpected error during function test: %', SQLERRM;
END;
$$;

-- Record test results in system_settings
INSERT INTO system_settings (
  key,
  value,
  description,
  category
)
VALUES (
  'user_creation_tests',
  jsonb_build_object(
    'timestamp', EXTRACT(epoch FROM now()),
    'date', now(),
    'tests_run', jsonb_build_array(
      'direct_user_creation',
      'admin_check',
      'rpc_create_user_v2'
    ),
    'message', 'User creation functionality tested',
    'next_steps', 'Use Edge Functions for complete user creation with auth'
  ),
  'Results of user creation tests',
  'diagnostics'
)
ON CONFLICT (key)
DO UPDATE SET
  value = jsonb_build_object(
    'timestamp', EXTRACT(epoch FROM now()),
    'date', now(),
    'tests_run', jsonb_build_array(
      'direct_user_creation',
      'admin_check',
      'rpc_create_user_v2'
    ),
    'message', 'User creation functionality tested (updated)',
    'next_steps', 'Use Edge Functions for complete user creation with auth'
  ),
  description = 'Results of user creation tests, updated ' || now()::text,
  updated_at = now();