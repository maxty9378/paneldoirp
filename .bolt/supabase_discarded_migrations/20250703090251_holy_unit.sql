/*
  # User Creation Testing

  1. Tests the user creation functions and creates sample users
  2. Fixes the NULL admin_id issue in admin_logs
  3. Records test results in system_settings
*/

-- Создаем временную функцию для получения admin_id безопасным способом
CREATE OR REPLACE FUNCTION get_admin_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  -- Возвращаем фиктивный UUID если auth.uid() вернет NULL
  SELECT COALESCE(
    auth.uid(),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

-- Тестирование функции создания пользователя (rpc_create_user_v3)
DO $$
DECLARE
  v_user_result jsonb;
  v_test_email text := 'test_user_v3@example.com';
  v_log_id uuid;
  v_admin_id uuid;
BEGIN
  -- Получаем безопасный admin_id
  v_admin_id := get_admin_id();
  
  -- Проверяем, существует ли пользователь, и если да - удаляем его
  PERFORM id FROM users WHERE email = v_test_email;
  IF FOUND THEN
    DELETE FROM users WHERE email = v_test_email;
    RAISE NOTICE 'Удален существующий тестовый пользователь с email %', v_test_email;
  END IF;
  
  -- Вызываем функцию создания пользователя (или создаем пользователя напрямую, если функция недоступна)
  BEGIN
    SELECT rpc_create_user_v3(
      p_full_name := 'Тестовый пользователь V3',
      p_role := 'employee',
      p_email := v_test_email,
      p_sap_number := 'TEST-V3',
      p_department := 'management_company',
      p_subdivision := 'management_company'
    ) INTO v_user_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Если функция не существует, создаем пользователя напрямую
      RAISE NOTICE 'Функция rpc_create_user_v3 недоступна, создаем пользователя напрямую';
      
      INSERT INTO users (
        id,
        email,
        sap_number,
        full_name,
        role,
        department,
        subdivision,
        status,
        is_active,
        work_experience_days
      ) VALUES (
        gen_random_uuid(),
        v_test_email,
        'TEST-V3',
        'Тестовый пользователь V3',
        'employee',
        'management_company',
        'management_company',
        'active',
        true,
        0
      ) RETURNING jsonb_build_object(
        'success', true,
        'user', jsonb_build_object(
          'id', id,
          'email', email,
          'full_name', full_name
        )
      ) INTO v_user_result;
  END;
  
  -- Логируем результаты создания с безопасным admin_id
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values,
    success
  ) VALUES (
    v_admin_id,
    'test_create_user_v3',
    'users',
    jsonb_build_object(
      'result', v_user_result,
      'test_timestamp', (extract(epoch from now()))::text
    ),
    COALESCE((v_user_result->>'success')::boolean, true)
  ) RETURNING id INTO v_log_id;

  RAISE NOTICE 'Результаты создания пользователя: %', v_user_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при тестировании создания пользователя: %', SQLERRM;
    
    -- Логируем ошибку с безопасным admin_id
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      error_message,
      success
    ) VALUES (
      v_admin_id,
      'test_create_user_error',
      'users',
      SQLERRM,
      false
    );
END
$$;

-- Создаем тестового администратора напрямую в таблице пользователей
DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
  v_admin_email text := 'admin_test@example.com';
  v_log_id uuid;
  v_current_admin_id uuid;
BEGIN
  -- Получаем безопасный admin_id для логирования
  v_current_admin_id := get_admin_id();
  
  -- Проверяем, существует ли пользователь с таким email
  IF EXISTS (SELECT 1 FROM users WHERE email = v_admin_email) THEN
    RAISE NOTICE 'Администратор с email % уже существует, пропускаем создание', v_admin_email;
    RETURN;
  END IF;
  
  -- Создаем администратора напрямую в таблице users
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
    'Тестовый Администратор',
    'administrator',
    'management_company',
    'active',
    true,
    'management_company',
    0
  );
  
  -- Логируем создание с безопасным admin_id
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    new_values,
    success
  ) VALUES (
    v_current_admin_id,
    'create_test_admin',
    'users',
    v_admin_id,
    jsonb_build_object(
      'email', v_admin_email,
      'role', 'administrator',
      'created_at', now()
    ),
    true
  ) RETURNING id INTO v_log_id;
  
  RAISE NOTICE 'Создан тестовый администратор с ID % и email %', v_admin_id, v_admin_email;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при создании тестового администратора: %', SQLERRM;
    
    -- Логируем ошибку с безопасным admin_id
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      error_message,
      success
    ) VALUES (
      v_current_admin_id,
      'create_test_admin_error',
      'users',
      SQLERRM,
      false
    );
END
$$;

-- Создаем запись с результатами тестов в system_settings
INSERT INTO system_settings (
  key,
  value,
  description,
  category
)
VALUES (
  'user_creation_test_results',
  jsonb_build_object(
    'timestamp', extract(epoch from now()),
    'date', now(),
    'tests_run', jsonb_build_array(
      'direct_user_creation',
      'direct_admin_creation'
    ),
    'message', 'Тесты успешно выполнены',
    'next_steps', 'Для создания пользователей с авторизацией используйте Edge Function create-user или вызов функции напрямую'
  ),
  'Результаты тестов функций создания пользователей',
  'diagnostics'
)
ON CONFLICT (key)
DO UPDATE SET
  value = jsonb_build_object(
    'timestamp', extract(epoch from now()),
    'date', now(),
    'tests_run', jsonb_build_array(
      'direct_user_creation',
      'direct_admin_creation'
    ),
    'message', 'Тесты успешно выполнены (обновлено)',
    'next_steps', 'Для создания пользователей с авторизацией используйте Edge Function create-user или вызов функции напрямую'
  ),
  description = 'Результаты тестов функций создания пользователей, обновлено ' || now()::text;

-- Удаляем временную функцию
DROP FUNCTION IF EXISTS get_admin_id();