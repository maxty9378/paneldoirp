/*
  # Create Admin User

  1. Initialize administrator account if not exists
  2. Ensure proper role and permissions

  Note: This migration assumes auth.users and public.users tables already exist.
*/

-- Create doirp@sns.ru administrator if not exists
DO $$
DECLARE
  v_user_exists BOOLEAN;
  v_admin_id UUID;
  v_admin_auth_id UUID;
BEGIN
  -- Check if admin user already exists
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE email = 'doirp@sns.ru'
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE NOTICE 'Creating administrator account...';

    -- Check if admin exists in auth.users
    SELECT id INTO v_admin_auth_id
    FROM auth.users
    WHERE email = 'doirp@sns.ru'
    LIMIT 1;

    IF v_admin_auth_id IS NULL THEN
      RAISE NOTICE 'Admin not found in auth.users. Would need to be created via API.';
    ELSE
      RAISE NOTICE 'Admin found in auth.users, creating profile in public.users...';

      -- Create admin user in public.users
      INSERT INTO users (
        id,
        email,
        full_name,
        role,
        subdivision,
        status,
        work_experience_days,
        position,
        is_active,
        department
      )
      VALUES (
        v_admin_auth_id,
        'doirp@sns.ru',
        'Администратор портала',
        'administrator',
        'management_company',
        'active',
        0,
        'Администратор системы',
        true,
        'management_company'
      )
      RETURNING id INTO v_admin_id;

      RAISE NOTICE 'Admin user created with ID: %', v_admin_id;
    END IF;
  ELSE
    RAISE NOTICE 'Admin user already exists, ensuring correct role...';
    
    -- Update existing admin to ensure correct role
    UPDATE users
    SET 
      role = 'administrator',
      is_active = true
    WHERE email = 'doirp@sns.ru';
    
    RAISE NOTICE 'Admin role enforced for doirp@sns.ru';
  END IF;
END $$;