-- This migration permanently disables Row Level Security on all tables to facilitate development
-- For production, RLS should be re-enabled with proper policies

-- Completely disable RLS for all main tables
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS territories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_activity_logs DISABLE ROW LEVEL SECURITY;

-- Ensure admin user exists and has correct role
DO $$
DECLARE
  admin_exists BOOLEAN;
  admin_auth_id UUID;
BEGIN
  -- Check if admin exists
  SELECT EXISTS(SELECT 1 FROM users WHERE email = 'doirp@sns.ru') INTO admin_exists;
  
  -- Try to get auth id if it exists
  SELECT id INTO admin_auth_id FROM auth.users WHERE email = 'doirp@sns.ru' LIMIT 1;
  
  IF admin_exists THEN
    -- Update admin to ensure proper attributes
    UPDATE users
    SET 
      role = 'administrator',
      is_active = TRUE,
      status = 'active',
      subdivision = 'management_company',
      department = 'management_company',
      position = 'Администратор системы'
    WHERE email = 'doirp@sns.ru';
    
    RAISE NOTICE 'Admin user updated';
  ELSE
    -- Create admin user with auth ID if available, otherwise with a new UUID
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      subdivision,
      status,
      work_experience_days,
      is_active,
      department,
      position
    ) VALUES (
      COALESCE(admin_auth_id, gen_random_uuid()),
      'doirp@sns.ru',
      'Администратор портала',
      'administrator',
      'management_company',
      'active',
      0,
      TRUE,
      'management_company',
      'Администратор системы'
    );
    
    RAISE NOTICE 'Admin user created';
  END IF;
END $$;

-- Add function to get deployment status
CREATE OR REPLACE FUNCTION get_deployment_status(p_deployment_id TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_status JSONB;
BEGIN
  -- In a real implementation, this would check a deployment table
  -- For now, we'll return mock data
  v_status := jsonb_build_object(
    'id', COALESCE(p_deployment_id, 'mock-deployment-id'),
    'status', 'success',
    'url', 'https://example.com',
    'created_at', NOW(),
    'updated_at', NOW(),
    'project_name', 'SNS Training Platform',
    'commit_message', 'Initial deployment',
    'branch', 'main',
    'environment', 'production'
  );
  
  RETURN v_status;
END;
$$ LANGUAGE plpgsql;

-- Add function to track stuck loading states
CREATE OR REPLACE FUNCTION reset_loading_state(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- In a real implementation, this would update a user_state table
  -- For now, we'll return mock data
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'loading_state', 'reset',
    'timestamp', NOW(),
    'success', true
  );
  
  -- Log the reset
  INSERT INTO user_activity_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_user_id,
    'reset_loading_state',
    'user',
    p_user_id,
    v_result
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;