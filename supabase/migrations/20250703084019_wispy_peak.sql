/*
  # Fix parameter defaults in create user functions

  1. Changes
     - Reordered parameters in rpc_create_user_v2 function to fix "input parameters after one with a default value must also have defaults" error
     - Required parameters are now listed first, followed by parameters with defaults
     - Maintained all functionality while fixing the syntax error

  2. Functions
     - rpc_create_user_v2: Creates users with auth integration
     - rpc_delete_user_complete: Fully removes users from both auth and public tables
     - rpc_delete_auth_user: Removes only the auth record for a user
*/

-- Функция для создания пользователей с приоритетом auth.users
CREATE OR REPLACE FUNCTION rpc_create_user_v2(
  p_full_name text,
  p_email text DEFAULT NULL,
  p_role user_role_enum DEFAULT 'employee',
  p_sap_number text DEFAULT NULL,
  p_position_id uuid DEFAULT NULL,
  p_territory_id uuid DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT 'management_company',
  p_subdivision subdivision_enum DEFAULT 'management_company',
  p_branch_id uuid DEFAULT NULL,
  p_branch_subrole branch_subrole_enum DEFAULT NULL,
  p_password text DEFAULT '123456'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_instance_id uuid;
  v_auth_created boolean := false;
  v_log_id uuid;
  v_result jsonb;
BEGIN
  -- Проверка прав доступа
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Недостаточно прав для создания пользователей';
  END IF;
  
  -- Валидация входных данных
  IF p_full_name IS NULL OR p_full_name = '' THEN
    RAISE EXCEPTION 'ФИО обязательно для заполнения';
  END IF;

  -- Должен быть указан либо email, либо SAP номер
  IF (p_email IS NULL OR p_email = '') AND (p_sap_number IS NULL OR p_sap_number = '') THEN
    RAISE EXCEPTION 'Необходимо указать email или SAP номер';
  END IF;

  -- Проверка на существование email или SAP номера
  IF p_email IS NOT NULL AND p_email != '' THEN
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
      RAISE EXCEPTION 'Пользователь с таким email уже существует';
    END IF;
    
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
      RAISE EXCEPTION 'Пользователь с таким email уже существует в auth системе';
    END IF;
  END IF;
  
  IF p_sap_number IS NOT NULL AND p_sap_number != '' THEN
    IF EXISTS (SELECT 1 FROM users WHERE sap_number = p_sap_number) THEN
      RAISE EXCEPTION 'Пользователь с таким SAP номером уже существует';
    END IF;
  END IF;

  -- Получаем ID инстанса auth для создания записей
  BEGIN
    SELECT instance_id INTO v_instance_id
    FROM auth.instances
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      -- Логируем ошибку, но продолжаем только если не нужно создавать auth пользователя
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        error_message,
        success
      ) VALUES (
        auth.uid(),
        'get_instance_id_error',
        'auth.instances',
        SQLERRM,
        false
      ) RETURNING id INTO v_log_id;
      
      -- Прерываем только если нужно создать auth пользователя
      IF p_email IS NOT NULL AND p_email != '' THEN
        RAISE EXCEPTION 'Ошибка получения ID инстанса auth: %', SQLERRM;
      END IF;
  END;

  -- Начинаем транзакцию
  BEGIN
    -- Если указан email, сначала создаем auth пользователя
    IF p_email IS NOT NULL AND p_email != '' AND v_instance_id IS NOT NULL THEN
      -- Генерируем UUID для нового пользователя
      v_user_id := gen_random_uuid();
      
      -- Создаем пользователя в auth.users
      BEGIN
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
          NOW(), -- Автоматически подтверждаем email
          jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
          jsonb_build_object(
            'full_name', p_full_name,
            'role', p_role::text
          ),
          NOW(),
          NOW()
        );
        
        -- Добавляем запись идентификации
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
          'create_auth_user',
          'auth.users',
          v_user_id,
          jsonb_build_object(
            'email', p_email,
            'password', '******' -- Не логируем настоящий пароль
          ),
          true
        ) RETURNING id INTO v_log_id;
      EXCEPTION
        WHEN OTHERS THEN
          -- Логируем ошибку, но прерываем выполнение
          INSERT INTO admin_logs (
            admin_id,
            action,
            resource_type,
            error_message,
            success
          ) VALUES (
            auth.uid(),
            'create_auth_user_error',
            'auth.users',
            SQLERRM,
            false
          ) RETURNING id INTO v_log_id;
          
          RAISE EXCEPTION 'Ошибка создания auth пользователя: %', SQLERRM;
      END;
    ELSE
      -- Если email не указан, генерируем UUID для пользователя только в public
      v_user_id := gen_random_uuid();
      
      -- Логируем создание пользователя без auth записи
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        new_values
      ) VALUES (
        auth.uid(),
        'create_public_user_only',
        'users',
        v_user_id,
        jsonb_build_object(
          'sap_number', p_sap_number,
          'reason', CASE 
                      WHEN p_email IS NULL OR p_email = '' THEN 'Email не указан' 
                      ELSE 'ID инстанса auth недоступен'
                    END
        )
      ) RETURNING id INTO v_log_id;
    END IF;
    
    -- Теперь создаем пользователя в public.users с тем же ID
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
      p_phone,
      p_department,
      p_subdivision,
      p_branch_id,
      p_branch_subrole,
      'active',
      true,
      0,
      CASE WHEN v_auth_created THEN NOW() ELSE NULL END
    );
    
    -- Логируем успешное создание пользователя в public.users
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values,
      success
    ) VALUES (
      auth.uid(),
      'create_public_user',
      'users',
      v_user_id,
      jsonb_build_object(
        'email', p_email,
        'sap_number', p_sap_number,
        'full_name', p_full_name,
        'role', p_role
      ),
      true
    ) RETURNING id INTO v_log_id;
    
    -- Подготавливаем результат
    v_result := jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', v_user_id,
        'email', p_email,
        'sap_number', p_sap_number,
        'full_name', p_full_name,
        'role', p_role
      ),
      'auth_created', v_auth_created,
      'message', CASE 
                   WHEN v_auth_created THEN 'Пользователь успешно создан с возможностью входа'
                   ELSE 'Пользователь создан только в базе данных (вход невозможен)'
                 END,
      'tempPassword', CASE WHEN v_auth_created THEN p_password ELSE NULL END
    );
    
    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Логируем ошибку
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        error_message,
        success
      ) VALUES (
        auth.uid(),
        'create_user_error',
        'users',
        SQLERRM,
        false
      ) RETURNING id INTO v_log_id;
      
      RAISE EXCEPTION 'Ошибка создания пользователя: %', SQLERRM;
  END;
END;
$$;

-- Функция для полного удаления пользователя из обеих систем
CREATE OR REPLACE FUNCTION rpc_delete_user_complete(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_result jsonb;
  v_auth_deleted boolean := false;
BEGIN
  -- Только администраторы и модераторы могут удалять пользователей
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Недостаточно прав для удаления пользователей'
    );
  END IF;

  -- Получаем данные пользователя для логирования
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Пользователь не найден'
    );
  END IF;
  
  -- Начинаем транзакцию
  BEGIN
    -- Сначала пытаемся удалить из auth.users, если запись существует
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
      BEGIN
        -- Сначала удаляем из auth.identities из-за ограничений внешнего ключа
        DELETE FROM auth.identities WHERE user_id = p_user_id;
        
        -- Затем удаляем из auth.users
        DELETE FROM auth.users WHERE id = p_user_id;
        
        v_auth_deleted := true;
      EXCEPTION WHEN OTHERS THEN
        -- Логируем ошибку, но продолжаем для удаления из public.users
        INSERT INTO admin_logs (
          admin_id,
          action,
          resource_type,
          resource_id,
          error_message,
          success
        ) VALUES (
          auth.uid(),
          'delete_auth_user_error',
          'auth.users',
          p_user_id,
          SQLERRM,
          false
        );
      END;
    END IF;
    
    -- Удаляем из public.users
    DELETE FROM users WHERE id = p_user_id;
    
    -- Логируем действие
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      old_values,
      success
    ) VALUES (
      auth.uid(),
      'delete_user_complete',
      'users',
      p_user_id,
      jsonb_build_object(
        'email', v_user.email,
        'sap_number', v_user.sap_number,
        'full_name', v_user.full_name,
        'auth_deleted', v_auth_deleted
      ),
      true
    );
    
    -- Возвращаем результат
    RETURN jsonb_build_object(
      'success', true,
      'message', CASE 
                   WHEN v_auth_deleted THEN 'Пользователь полностью удален из системы'
                   ELSE 'Пользователь удален из базы данных'
                 END,
      'id', p_user_id,
      'auth_deleted', v_auth_deleted
    );
  EXCEPTION
    WHEN OTHERS THEN
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
        'delete_user_error',
        'users',
        p_user_id,
        SQLERRM,
        false
      );
      
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Ошибка удаления пользователя: ' || SQLERRM,
        'id', p_user_id
      );
  END;
END;
$$;

-- Функция для надежного удаления только auth записи пользователя
CREATE OR REPLACE FUNCTION rpc_delete_auth_user(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_result jsonb;
BEGIN
  -- Только администраторы могут удалять пользователей
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Недостаточно прав для удаления пользователей'
    );
  END IF;

  -- Получаем данные пользователя для логирования
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Пользователь не найден'
    );
  END IF;
  
  -- Начинаем транзакцию
  BEGIN
    -- Проверяем существование auth записи
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Auth запись не найдена для пользователя'
      );
    END IF;
    
    -- Сначала удаляем из auth.identities из-за ограничений внешнего ключа
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    
    -- Затем удаляем из auth.users
    DELETE FROM auth.users WHERE id = p_user_id;
    
    -- Логируем действие
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      old_values,
      success
    ) VALUES (
      auth.uid(),
      'delete_auth_user',
      'auth.users',
      p_user_id,
      jsonb_build_object(
        'email', v_user.email,
        'full_name', v_user.full_name
      ),
      true
    );
    
    -- Возвращаем результат
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Auth запись пользователя успешно удалена',
      'id', p_user_id
    );
  EXCEPTION
    WHEN OTHERS THEN
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
        'delete_auth_user_failed',
        'auth.users',
        p_user_id,
        SQLERRM,
        false
      );
      
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Ошибка удаления auth записи: ' || SQLERRM
      );
  END;
END;
$$;

-- Выдаем права на выполнение функций
GRANT EXECUTE ON FUNCTION rpc_create_user_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_delete_user_complete TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_delete_auth_user TO authenticated;