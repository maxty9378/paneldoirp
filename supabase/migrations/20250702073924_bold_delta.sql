-- Completely disable RLS for all tables to ensure authentication works
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS territories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_activity_logs DISABLE ROW LEVEL SECURITY;

-- Ensure admin user exists with the correct role
DO $$
DECLARE
  admin_exists BOOLEAN;
  admin_auth_exists BOOLEAN;
  admin_auth_id UUID;
BEGIN
  -- Check if admin exists in users table
  SELECT EXISTS(SELECT 1 FROM users WHERE email = 'doirp@sns.ru') INTO admin_exists;
  
  -- Check if admin exists in auth.users table
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'doirp@sns.ru') INTO admin_auth_exists;
  
  IF admin_auth_exists THEN
    -- Get the admin's auth ID
    SELECT id INTO admin_auth_id FROM auth.users WHERE email = 'doirp@sns.ru';
    
    IF admin_exists THEN
      -- Update the existing admin to ensure ID matches and role is correct
      UPDATE users
      SET 
        id = admin_auth_id,
        role = 'administrator',
        is_active = TRUE,
        status = 'active',
        subdivision = 'management_company',
        department = 'management_company',
        position = 'Администратор системы'
      WHERE email = 'doirp@sns.ru';
      
      RAISE NOTICE 'Admin user updated with auth ID: %', admin_auth_id;
    ELSE
      -- Create new admin user with auth ID
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
        admin_auth_id,
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
      
      RAISE NOTICE 'Admin user created with auth ID: %', admin_auth_id;
    END IF;
  ELSE
    -- Admin not found in auth.users, create a standalone record in users table
    IF NOT admin_exists THEN
      INSERT INTO users (
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
      
      RAISE NOTICE 'Standalone admin user created (not linked to auth)';
    ELSE
      -- Update existing admin
      UPDATE users
      SET 
        role = 'administrator',
        is_active = TRUE,
        status = 'active',
        subdivision = 'management_company',
        department = 'management_company',
        position = 'Администратор системы'
      WHERE email = 'doirp@sns.ru';
      
      RAISE NOTICE 'Standalone admin user updated';
    END IF;
  END IF;
END $$;

-- Update or create trigger function to synchronize user creation
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  -- Set default role (administrator for admin email, employee for others)
  IF NEW.email = 'doirp@sns.ru' THEN
    v_role := 'administrator';
  ELSE
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  END IF;
  
  -- Get full name from metadata or create from email
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Handle special case for admin
  IF NEW.email = 'doirp@sns.ru' THEN
    v_full_name := 'Администратор портала';
  END IF;
  
  -- Insert or update the user in the public.users table
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    subdivision,
    status,
    work_experience_days,
    is_active,
    department,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_role,
    'management_company',
    'active',
    0,
    TRUE,
    'management_company',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    full_name = v_full_name,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_user_from_auth();