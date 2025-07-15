/*
  # Тестирование функции создания пользователей

  1. Проверка доступа к auth таблицам
  2. Создание тестового пользователя
  3. Добавление записей о выполнении тестов
*/

-- Сначала запускаем функцию проверки схемы auth таблиц
DO $$
DECLARE
  v_schema_check jsonb;
  v_log_id uuid;
BEGIN
  SELECT check_auth_schema() INTO v_schema_check;
  
  -- Логируем результаты проверки
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values,
    success
  ) VALUES (
    auth.uid(),
    'schema_check_test',
    'database',
    v_schema_check,
    true
  ) RETURNING id INTO v_log_id;

  RAISE NOTICE 'Результаты проверки схемы auth: %', v_schema_check;
END
$$;

-- Тестирование функции создания пользователя без auth (rpc_create_user_v3)
DO $$
DECLARE
  v_user_result jsonb;
  v_test_email text := 'test_user_v3@example.com';
  v_log_id uuid;
BEGIN
  -- Проверяем, существует ли пользователь, и если да - удаляем его
  PERFORM id FROM users WHERE email = v_test_email;
  IF FOUND THEN
    DELETE FROM users WHERE email = v_test_email;
    RAISE NOTICE 'Удален существующий тестовый пользователь с email %', v_test_email;
  END IF;
  
  -- Вызываем функцию создания пользователя
  SELECT rpc_create_user_v3(
    p_full_name := 'Тестовый пользователь V3',
    p_role := 'employee',
    p_email := v_test_email,
    p_sap_number := 'TEST-V3',
    p_department := 'management_company',
    p_subdivision := 'management_company'
  ) INTO v_user_result;
  
  -- Логируем результаты создания
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values,
    success
  ) VALUES (
    auth.uid(),
    'test_create_user_v3',
    'users',
    jsonb_build_object(
      'result', v_user_result,
      'test_timestamp', (extract(epoch from now()))::text
    ),
    (v_user_result->>'success')::boolean
  ) RETURNING id INTO v_log_id;

  RAISE NOTICE 'Результаты создания пользователя через rpc_create_user_v3: %', v_user_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при тестировании rpc_create_user_v3: %', SQLERRM;
    
    -- Логируем ошибку
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      error_message,
      success
    ) VALUES (
      auth.uid(),
      'test_create_user_v3_error',
      'users',
      SQLERRM,
      false
    );
END
$$;

-- Тестирование функции создания пользователя с безопасным подходом (rpc_create_user_safe)
DO $$
DECLARE
  v_user_result jsonb;
  v_test_email text := 'test_user_safe@example.com';
  v_log_id uuid;
BEGIN
  -- Проверяем, существует ли пользователь, и если да - удаляем его
  PERFORM id FROM users WHERE email = v_test_email;
  IF FOUND THEN
    DELETE FROM users WHERE email = v_test_email;
    RAISE NOTICE 'Удален существующий тестовый пользователь с email %', v_test_email;
  END IF;
  
  -- Вызываем функцию создания пользователя
  SELECT rpc_create_user_safe(
    p_full_name := 'Тестовый пользователь Safe',
    p_email := v_test_email,
    p_role := 'employee',
    p_sap_number := 'TEST-SAFE',
    p_department := 'management_company',
    p_subdivision := 'management_company'
  ) INTO v_user_result;
  
  -- Логируем результаты создания
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    new_values,
    success
  ) VALUES (
    auth.uid(),
    'test_create_user_safe',
    'users',
    jsonb_build_object(
      'result', v_user_result,
      'test_timestamp', (extract(epoch from now()))::text
    ),
    (v_user_result->>'success')::boolean
  ) RETURNING id INTO v_log_id;

  RAISE NOTICE 'Результаты создания пользователя через rpc_create_user_safe: %', v_user_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при тестировании rpc_create_user_safe: %', SQLERRM;
    
    -- Логируем ошибку
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      error_message,
      success
    ) VALUES (
      auth.uid(),
      'test_create_user_safe_error',
      'users',
      SQLERRM,
      false
    );
END
$$;

-- Создаем тестового администратора через запрос непосредственно к таблице пользователей
DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
  v_admin_email text := 'admin_test@example.com';
  v_log_id uuid;
BEGIN
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
  
  -- Логируем создание
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    new_values,
    success
  ) VALUES (
    auth.uid(),
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
    
    -- Логируем ошибку
    INSERT INTO admin_logs (
      admin_id,
      action,
      resource_type,
      error_message,
      success
    ) VALUES (
      auth.uid(),
      'create_test_admin_error',
      'users',
      SQLERRM,
      false
    );
END
$$;

-- Создаем запись с результатами тестов
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
      'check_auth_schema',
      'rpc_create_user_v3',
      'rpc_create_user_safe',
      'direct_admin_creation'
    ),
    'functions_available', jsonb_build_array(
      'rpc_create_user_v3',
      'rpc_create_user_safe',
      'create_auth_user_edge_compatible',
      'request_create_auth_user'
    ),
    'next_steps', 'Используйте Edge Function create-user-and-auth для создания пользователей с авторизацией, или функцию rpc_create_user_v3 для создания пользователей только в базе данных.'
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
      'check_auth_schema',
      'rpc_create_user_v3',
      'rpc_create_user_safe',
      'direct_admin_creation'
    ),
    'functions_available', jsonb_build_array(
      'rpc_create_user_v3',
      'rpc_create_user_safe',
      'create_auth_user_edge_compatible',
      'request_create_auth_user'
    ),
    'next_steps', 'Используйте Edge Function create-user-and-auth для создания пользователей с авторизацией, или функцию rpc_create_user_v3 для создания пользователей только в базе данных.'
  ),
  description = 'Результаты тестов функций создания пользователей, обновлено ' || now()::text;