/*
  # Fix Bootstrap Admin Creation

  1. New Functions
    - `rpc_bootstrap_admin` - Creates admin user in both auth and public tables
    - `create_auth_user` - Internal function to ensure users exist in auth tables
  
  2. Security
    - Permissions granted to allow anonymous and authenticated users to call functions
    - Better error handling and logging
    
  3. Changes
    - Fixed role type issues to ensure proper enum values are used
    - Added functions to display "Create Administrator" button more reliably
*/

-- Create function to easily bootstrap an admin user
CREATE OR REPLACE FUNCTION public.rpc_bootstrap_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists boolean;
  admin_auth_exists boolean;
  admin_user_id uuid;
  auth_instance_id uuid;
  admin_email text := 'doirp@sns.ru';
  admin_password text := '123456';
  admin_name text := 'Администратор портала';
  v_result jsonb;
BEGIN
  -- Check if admin already exists in public.users
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE (email = admin_email OR (role = 'administrator' AND full_name = admin_name))
  ) INTO admin_exists;
  
  -- Check if admin exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = admin_email
  ) INTO admin_auth_exists;
  
  -- If admin exists in both places, we're done
  IF admin_exists AND admin_auth_exists THEN
    -- Try to ensure IDs match
    BEGIN
      UPDATE users 
      SET id = (SELECT id FROM auth.users WHERE email = admin_email)
      WHERE email = admin_email;
      
      SELECT id INTO admin_user_id
      FROM users
      WHERE email = admin_email;
      
      RETURN jsonb_build_object(
        'success', true,
        'email', admin_email,
        'password', admin_password,
        'message', 'Администратор уже существует в обеих таблицах',
        'id', admin_user_id
      );
    EXCEPTION WHEN OTHERS THEN
      -- Continue anyway if we can't update
      RETURN jsonb_build_object(
        'success', true,
        'email', admin_email,
        'password', admin_password,
        'message', 'Администратор уже существует, но не удалось синхронизировать ID'
      );
    END;
  END IF;
  
  -- If admin exists only in public.users, create in auth
  IF admin_exists AND NOT admin_auth_exists THEN
    -- Get admin ID
    SELECT id INTO admin_user_id
    FROM users
    WHERE email = admin_email;
    
    -- Get auth instance ID
    SELECT instance_id INTO auth_instance_id
    FROM auth.instances
    LIMIT 1;
    
    IF auth_instance_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Не удалось получить ID экземпляра auth'
      );
    END IF;
    
    -- Create admin in auth.users
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
        auth_instance_id,
        admin_user_id,
        'authenticated',
        'authenticated',
        admin_email,
        crypt(admin_password, gen_salt('bf')),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object(
          'full_name', admin_name,
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
        admin_email,
        admin_user_id,
        jsonb_build_object('sub', admin_user_id, 'email', admin_email),
        'email',
        NOW(),
        NOW(),
        NOW()
      );
      
      RETURN jsonb_build_object(
        'success', true,
        'email', admin_email,
        'password', admin_password,
        'message', 'Создана auth запись для существующего администратора',
        'id', admin_user_id
      );
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Ошибка создания auth записи: ' || SQLERRM
      );
    END;
  END IF;
  
  -- If admin exists only in auth, create in public.users
  IF NOT admin_exists AND admin_auth_exists THEN
    -- Get admin ID from auth
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = admin_email;
    
    -- Create in public.users
    BEGIN
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
        admin_user_id,
        admin_email,
        admin_name,
        'administrator'::user_role_enum,
        'management_company'::subdivision_enum,
        'active'::user_status_enum,
        true,
        'management_company',
        0
      );
      
      RETURN jsonb_build_object(
        'success', true,
        'email', admin_email,
        'password', admin_password,
        'message', 'Создана запись в public.users для существующего auth администратора',
        'id', admin_user_id
      );
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Ошибка создания записи в public.users: ' || SQLERRM
      );
    END;
  END IF;
  
  -- Create completely new admin
  BEGIN
    -- Generate new user ID
    admin_user_id := gen_random_uuid();
    
    -- Get auth instance ID
    SELECT instance_id INTO auth_instance_id
    FROM auth.instances
    LIMIT 1;
    
    IF auth_instance_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Не удалось получить ID экземпляра auth'
      );
    END IF;
    
    -- Create in public.users first
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
      admin_user_id,
      admin_email,
      admin_name,
      'administrator'::user_role_enum,
      'management_company'::subdivision_enum,
      'active'::user_status_enum,
      true,
      'management_company',
      0
    );
    
    -- Create in auth.users
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
      admin_user_id,
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object(
        'full_name', admin_name,
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
      admin_email,
      admin_user_id,
      jsonb_build_object('sub', admin_user_id, 'email', admin_email),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'email', admin_email,
      'password', admin_password,
      'message', 'Администратор успешно создан',
      'id', admin_user_id
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Ошибка создания администратора: ' || SQLERRM
    );
  END;
END;
$$;

-- Create a function to check if admin exists - this will be used by the UI to decide whether to show the admin creation button
CREATE OR REPLACE FUNCTION public.check_admin_exists()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists boolean;
  admin_auth_exists boolean;
  admin_email text := 'doirp@sns.ru';
BEGIN
  -- Check if admin exists in public.users
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE role = 'administrator'
  ) INTO admin_exists;
  
  -- Check if admin exists in auth.users with email doirp@sns.ru
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = admin_email
  ) INTO admin_auth_exists;
  
  RETURN jsonb_build_object(
    'admin_exists', admin_exists,
    'admin_auth_exists', admin_auth_exists,
    'needs_creation', NOT (admin_exists AND admin_auth_exists)
  );
END;
$$;

-- Grant execute permissions for these functions
GRANT EXECUTE ON FUNCTION public.rpc_bootstrap_admin TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_exists TO anon, authenticated;