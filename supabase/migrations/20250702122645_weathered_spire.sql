/*
  # Улучшение триггера для создания пользователей

  1. Обновленные функции
    - `after_user_created_in_users` - Улучшен с детальным логированием ошибок
      и проверкой на существующих пользователей
    
  2. Улучшения
    - Добавлено подробное логирование для отладки проблем
    - Корректная обработка исключений
    - Функция имеет права SECURITY DEFINER для доступа к auth схеме
*/

-- Улучшаем триггер функцию с лучшей обработкой ошибок
CREATE OR REPLACE FUNCTION after_user_created_in_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password text := '123456';
  v_instance_id uuid;
  v_error text;
BEGIN
  -- Логируем выполнение функции для отладки
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    new_values
  ) VALUES (
    COALESCE(auth.uid(), NEW.id),
    'trigger_executed',
    'users',
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'trigger', 'after_user_created_in_users'
    )
  );

  -- Только если предоставлен email
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    -- Получаем ID экземпляра auth
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
        COALESCE(auth.uid(), NEW.id),
        'trigger_get_instance_id_success',
        'auth.instances',
        NEW.id,
        jsonb_build_object(
          'instance_id', v_instance_id
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        v_error := SQLERRM;
        -- Логируем ошибку получения instance_id
        INSERT INTO admin_logs (
          admin_id,
          action,
          resource_type,
          resource_id,
          error_message,
          success
        ) VALUES (
          COALESCE(auth.uid(), NEW.id),
          'trigger_get_instance_id_failed',
          'auth.instances',
          NEW.id,
          v_error,
          false
        );
        RETURN NEW;
    END;
    
    -- Создаем пользователя в auth.users если он не существует
    IF NOT EXISTS (
      SELECT 1 FROM auth.users WHERE id = NEW.id
    ) AND NOT EXISTS (
      SELECT 1 FROM auth.users WHERE email = NEW.email
    ) THEN
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
          NEW.id,
          'authenticated',
          'authenticated',
          NEW.email,
          crypt(v_password, gen_salt('bf')),
          NOW(),
          jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
          jsonb_build_object(
            'full_name', NEW.full_name,
            'role', NEW.role
          ),
          NOW(),
          NOW()
        );
        
        -- Логируем успешное создание auth пользователя
        INSERT INTO admin_logs (
          admin_id,
          action,
          resource_type,
          resource_id,
          new_values
        ) VALUES (
          COALESCE(auth.uid(), NEW.id),
          'trigger_auth_user_created',
          'auth.users',
          NEW.id,
          jsonb_build_object(
            'email', NEW.email,
            'password', v_password
          )
        );
        
        -- Добавляем identity пользователя
        BEGIN
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
          
          -- Логируем успешное создание identity
          INSERT INTO admin_logs (
            admin_id,
            action,
            resource_type,
            resource_id,
            new_values
          ) VALUES (
            COALESCE(auth.uid(), NEW.id),
            'trigger_identity_created',
            'auth.identities',
            NEW.id,
            jsonb_build_object(
              'email', NEW.email
            )
          );
        EXCEPTION
          WHEN OTHERS THEN
            v_error := SQLERRM;
            -- Логируем ошибку создания identity
            INSERT INTO admin_logs (
              admin_id,
              action,
              resource_type,
              resource_id,
              error_message,
              success
            ) VALUES (
              COALESCE(auth.uid(), NEW.id),
              'trigger_identity_creation_failed',
              'auth.identities',
              NEW.id,
              v_error,
              false
            );
        END;
      EXCEPTION
        WHEN OTHERS THEN
          v_error := SQLERRM;
          -- Логируем ошибку создания auth пользователя
          INSERT INTO admin_logs (
            admin_id,
            action,
            resource_type,
            resource_id,
            error_message,
            success
          ) VALUES (
            COALESCE(auth.uid(), NEW.id),
            'trigger_auth_user_creation_failed',
            'auth.users',
            NEW.id,
            v_error,
            false
          );
      END;
    ELSE
      -- Логируем, что auth пользователь уже существует
      INSERT INTO admin_logs (
        admin_id,
        action,
        resource_type,
        resource_id,
        new_values
      ) VALUES (
        COALESCE(auth.uid(), NEW.id),
        'trigger_auth_user_already_exists',
        'auth.users',
        NEW.id,
        jsonb_build_object(
          'email', NEW.email
        )
      );
    END IF;
  ELSE
    -- Логируем, что email не был предоставлен
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      COALESCE(auth.uid(), NEW.id),
      'trigger_no_email_for_auth',
      'users',
      NEW.id,
      jsonb_build_object(
        'sap_number', NEW.sap_number
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Пересоздаем триггер, чтобы убедиться, что он активен
DROP TRIGGER IF EXISTS after_user_created ON users;
CREATE TRIGGER after_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION after_user_created_in_users();

-- Создаем функцию для ручного создания auth пользователя для существующего пользователя
CREATE OR REPLACE FUNCTION create_auth_for_existing_user(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_instance_id uuid;
  v_password text := '123456';
  v_error text;
BEGIN
  -- Только администраторы могут использовать эту функцию
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('administrator', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Недостаточно прав для создания auth пользователя';
  END IF;
  
  -- Получаем данные пользователя
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Пользователь не найден';
  END IF;
  
  IF v_user.email IS NULL OR v_user.email = '' THEN
    RAISE EXCEPTION 'У пользователя нет email адреса';
  END IF;
  
  -- Проверяем, существует ли auth пользователь
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_user_id OR email = v_user.email
  ) THEN
    RAISE EXCEPTION 'Auth пользователь с таким id или email уже существует';
  END IF;
  
  -- Получаем ID экземпляра auth
  SELECT instance_id INTO v_instance_id
  FROM auth.instances
  LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    RAISE EXCEPTION 'Не найден экземпляр auth';
  END IF;
  
  -- Создаем auth пользователя
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
      p_user_id,
      'authenticated',
      'authenticated',
      v_user.email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object(
        'full_name', v_user.full_name,
        'role', v_user.role
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
      v_user.email,
      p_user_id,
      jsonb_build_object('sub', p_user_id, 'email', v_user.email),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
    
    -- Логируем действие
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      resource_id,
      new_values
    ) VALUES (
      auth.uid(),
      'create_auth_for_existing_user',
      'auth.users',
      p_user_id,
      jsonb_build_object(
        'email', v_user.email,
        'password', v_password
      )
    );
    
    RETURN jsonb_build_object(
      'id', p_user_id,
      'email', v_user.email,
      'full_name', v_user.full_name,
      'password', v_password,
      'message', 'Auth пользователь успешно создан'
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
        'create_auth_for_existing_user_failed',
        'auth.users',
        p_user_id,
        v_error,
        false
      );
      
      RAISE EXCEPTION 'Ошибка создания auth пользователя: %', v_error;
  END;
END;
$$;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION create_auth_for_existing_user TO authenticated;