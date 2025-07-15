/*
  # Исправление типов данных для user_role_enum

  1. Исправления
    - Изменены параметры в функциях с `p_role text` на `p_role user_role_enum`
    - Исправлены функции create_user_with_auth, update_user_auth, create_user_complete и rpc_create_user
    - Добавлено явное приведение типов при необходимости

  2. Цель изменений
    - Устранение ошибки типа: "column "role" is of type user_role_enum but expression is of type text (SQLSTATE 42804)"
    - Обеспечение корректной работы создания пользователей
*/

-- Исправленная функция create_user_with_auth с правильным типом для параметра роли
CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_email text,
  p_password text,
  p_full_name text,
  p_role user_role_enum DEFAULT 'employee'::user_role_enum,
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

-- Исправленная функция update_user_auth с правильным типом для параметра роли
CREATE OR REPLACE FUNCTION update_user_auth(
  p_user_id uuid,
  p_email text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_role user_role_enum DEFAULT NULL,
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
              'role', COALESCE(p_role::text, raw_user_meta_data->>'role')
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

-- Исправленная функция create_user_complete с правильным типом для параметра роли
CREATE OR REPLACE FUNCTION create_user_complete(
  p_email text,
  p_sap_number text,
  p_full_name text,
  p_role user_role_enum DEFAULT 'employee'::user_role_enum,
  p_position_id uuid DEFAULT NULL,
  p_territory_id uuid DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT 'management_company',
  p_subdivision subdivision_enum DEFAULT 'management_company'::subdivision_enum,
  p_branch_id uuid DEFAULT NULL,
  p_branch_subrole branch_subrole_enum DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_instance_id uuid;
  v_password text := '123456';
  v_auth_created boolean := false;
  v_error text;
BEGIN
  -- Валидация входных данных
  IF p_full_name IS NULL OR p_full_name = '' THEN
    RAISE EXCEPTION 'Имя пользователя обязательно';
  END IF;
  
  IF (p_email IS NULL OR p_email = '') AND (p_sap_number IS NULL OR p_sap_number = '') THEN
    RAISE EXCEPTION 'Должен быть указан email или SAP номер';
  END IF;
  
  -- Проверка на существующий email или SAP номер
  IF p_email IS NOT NULL AND p_email <> '' THEN
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
      RAISE EXCEPTION 'Пользователь с таким email уже существует';
    END IF;
    
    -- Также проверяем в auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
      RAISE EXCEPTION 'Пользователь с таким email уже существует в auth';
    END IF;
  END IF;
  
  IF p_sap_number IS NOT NULL AND p_sap_number <> '' THEN
    IF EXISTS (SELECT 1 FROM users WHERE sap_number = p_sap_number) THEN
      RAISE EXCEPTION 'Пользователь с таким SAP номером уже существует';
    END IF;
  END IF;
  
  -- Получаем instance_id для auth таблицы
  IF p_email IS NOT NULL AND p_email <> '' THEN
    BEGIN
      SELECT instance_id INTO v_instance_id
      FROM auth.instances
      LIMIT 1;
      
      -- Логируем успешное получение instance_id
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        new_values
      ) VALUES (
        auth.uid(),
        'get_instance_id_success',
        'auth.instances',
        NULL,
        jsonb_build_object(
          'instance_id', v_instance_id
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        v_error := SQLERRM;
        -- Логируем ошибку
        INSERT INTO admin_logs (
          admin_id,
          action,
          resource_type,
          resource_id,
          error_message,
          success
        ) VALUES (
          auth.uid(),
          'get_instance_id_failed',
          'auth.instances',
          NULL,
          v_error,
          false
        );
    END;
  END IF;
  
  -- Создаем пользователя в public.users
  INSERT INTO users (
    id,
    email,
    sap_number,
    full_name,
    role,
    position_id,
    territory_id,
    phone,
    department,
    subdivision,
    branch_id,
    branch_subrole,
    status,
    is_active,
    work_experience_days
  ) VALUES (
    v_user_id,
    p_email,
    p_sap_number,
    p_full_name,
    p_role,
    p_position_id,
    p_territory_id,
    p_phone,
    p_department,
    p_subdivision,
    p_branch_id,
    p_branch_subrole,
    'active',
    true,
    0
  );
  
  -- Пытаемся создать пользователя в auth.users если email предоставлен и instance_id доступен
  IF p_email IS NOT NULL AND p_email <> '' AND v_instance_id IS NOT NULL THEN
    BEGIN
      -- Создаем пользователя в auth.users
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
        crypt(v_password, gen_salt('bf')),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object(
          'full_name', p_full_name,
          'role', p_role::text
        ),
        NOW(),
        NOW()
      );
      
      -- Добавляем identity пользователя
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
      
      v_auth_created := true;
      
      -- Логируем успешное создание auth пользователя
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        new_values,
        success
      ) VALUES (
        auth.uid(),
        'create_auth_user_success',
        'auth.users',
        v_user_id,
        jsonb_build_object(
          'email', p_email,
          'password', v_password
        ),
        true
      );
    EXCEPTION
      WHEN OTHERS THEN
        v_error := SQLERRM;
        -- Логируем ошибку
        INSERT INTO admin_logs (
          admin_id,
          action,
          resource_type,
          resource_id,
          error_message,
          success
        ) VALUES (
          auth.uid(),
          'create_auth_user_failed',
          'auth.users',
          v_user_id,
          v_error,
          false
        );
    END;
  ELSIF p_email IS NULL OR p_email = '' THEN
    -- Логируем отсутствие email
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      auth.uid(),
      'no_email_for_auth_creation',
      'users',
      v_user_id,
      jsonb_build_object(
        'sap_number', p_sap_number
      )
    );
  END IF;
  
  -- Возвращаем результат
  RETURN jsonb_build_object(
    'id', v_user_id,
    'email', p_email,
    'sap_number', p_sap_number,
    'full_name', p_full_name,
    'role', p_role,
    'auth_created', v_auth_created,
    'password', v_password,
    'message', CASE WHEN v_auth_created 
                   THEN 'Пользователь успешно создан в обеих таблицах auth и public'
                   ELSE 'Пользователь создан только в таблице public.users'
               END
  );
END;
$$;

-- Исправленная RPC-функция для создания пользователя
CREATE OR REPLACE FUNCTION rpc_create_user(
  p_email text,
  p_full_name text,
  p_role user_role_enum DEFAULT 'employee'::user_role_enum,
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
    -- Запись ошибки в логи
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      error_message,
      success
    ) VALUES (
      auth.uid(),
      'rpc_create_user_error',
      'users',
      SQLERRM,
      false
    );
    
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'status', 'error'
    );
END;
$$;

-- Добавление комментария о роли в таблице
COMMENT ON COLUMN users.role IS 'Роль пользователя. Используйте enum user_role_enum, а не text.';

-- Проверка значений для повышения стабильности
CREATE OR REPLACE FUNCTION validate_user_role_input()
RETURNS trigger AS $$
BEGIN
  -- Проверяем, что значение роли допустимо
  IF NOT (NEW.role::text = ANY(enum_range(NULL::user_role_enum)::text[])) THEN
    RAISE EXCEPTION 'Недопустимая роль: %. Допустимые значения: %', NEW.role, enum_range(NULL::user_role_enum)::text[];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для проверки роли
DROP TRIGGER IF EXISTS validate_user_role_before_insert_update ON users;
CREATE TRIGGER validate_user_role_before_insert_update
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION validate_user_role_input();