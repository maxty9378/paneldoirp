/*
  # Исправление создания пользователей в auth

  1. Новые функции
    - `create_user_complete` - Создает пользователя в обеих таблицах auth.users и public.users
      с детальным логированием ошибок и проверкой на существующих пользователей
    
  2. Улучшения
    - Добавлено подробное логирование для отладки проблем
    - Обработка ошибок в каждом шаге
    - Возвращение понятных сообщений об ошибках
*/

-- Создаем функцию для надежного создания пользователей в обеих таблицах
CREATE OR REPLACE FUNCTION create_user_complete(
  p_email text,
  p_sap_number text,
  p_full_name text,
  p_role text DEFAULT 'employee',
  p_position_id uuid DEFAULT NULL,
  p_territory_id uuid DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT 'management_company',
  p_subdivision text DEFAULT 'management_company',
  p_branch_id uuid DEFAULT NULL,
  p_branch_subrole text DEFAULT NULL
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
          'role', p_role
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

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION create_user_complete TO authenticated;