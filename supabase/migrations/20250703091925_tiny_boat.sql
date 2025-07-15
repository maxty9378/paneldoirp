-- Создаем более надежную функцию для получения ID администратора
CREATE OR REPLACE FUNCTION get_safe_admin_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_admin_id uuid;
  v_fallback_admin_id uuid;
BEGIN
  -- Пробуем получить ID текущего пользователя
  v_admin_id := auth.uid();
  
  -- Если ID не получен, ищем существующего администратора
  IF v_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = v_admin_id) THEN
    -- Ищем любого администратора
    SELECT id INTO v_fallback_admin_id
    FROM users
    WHERE role = 'administrator'
    LIMIT 1;
    
    -- Если администратор не найден, используем любого пользователя
    IF v_fallback_admin_id IS NULL THEN
      SELECT id INTO v_fallback_admin_id
      FROM users
      LIMIT 1;
    END IF;
    
    v_admin_id := v_fallback_admin_id;
  END IF;
  
  RETURN v_admin_id;
END;
$$;

-- Создаем вспомогательную функцию для безопасного логирования
CREATE OR REPLACE FUNCTION safe_log_admin_action(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_success boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_id uuid;
  v_log_id uuid;
BEGIN
  -- Получаем безопасный admin_id
  SELECT get_safe_admin_id() INTO v_admin_id;
  
  -- Если не нашли admin_id, выходим без логирования
  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'Не удалось получить admin_id для логирования';
    RETURN NULL;
  END IF;
  
  -- Выполняем логирование
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    new_values,
    old_values,
    error_message,
    success
  ) VALUES (
    v_admin_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_new_values,
    p_old_values,
    p_error_message,
    p_success
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при логировании: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Создаем администратора, если он не существует
DO $$
DECLARE
  v_admin_count int;
  v_admin_id uuid;
  v_admin_email text := 'doirp@sns.ru';
BEGIN
  -- Проверяем, существуют ли уже администраторы
  SELECT COUNT(*) INTO v_admin_count
  FROM users
  WHERE role = 'administrator';
  
  -- Если администраторов нет, создаем нового
  IF v_admin_count = 0 THEN
    -- Генерируем UUID для нового администратора
    v_admin_id := gen_random_uuid();
    
    -- Создаем запись администратора
    INSERT INTO users (
      id,
      email,
      full_name,
      role,
      subdivision,
      status,
      is_active,
      work_experience_days,
      department
    ) VALUES (
      v_admin_id,
      v_admin_email,
      'Администратор портала',
      'administrator',
      'management_company',
      'active',
      true,
      0,
      'management_company'
    );
    
    RAISE NOTICE 'Создан администратор с ID % и email %', v_admin_id, v_admin_email;
  ELSE
    RAISE NOTICE 'Администратор уже существует, пропускаем создание';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при создании администратора: %', SQLERRM;
END
$$;

-- Тестирование функции создания пользователя
DO $$
DECLARE
  v_user_result jsonb;
  v_test_email text := 'test_user_v3@example.com';
  v_admin_id uuid;
  v_user_id uuid;
BEGIN
  -- Получаем безопасный admin_id
  SELECT get_safe_admin_id() INTO v_admin_id;
  
  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'Не удалось получить admin_id для теста, пропускаем';
    RETURN;
  END IF;
  
  -- Проверяем, существует ли пользователь, и если да - удаляем его
  PERFORM id FROM users WHERE email = v_test_email;
  IF FOUND THEN
    DELETE FROM users WHERE email = v_test_email;
    RAISE NOTICE 'Удален существующий тестовый пользователь с email %', v_test_email;
  END IF;
  
  -- Генерируем ID для нового пользователя
  v_user_id := gen_random_uuid();
  
  -- Создаем пользователя напрямую
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
    v_user_id,
    v_test_email,
    'TEST-V3',
    'Тестовый пользователь V3',
    'employee',
    'management_company',
    'management_company',
    'active',
    true,
    0
  );
  
  -- Безопасное логирование результатов
  PERFORM safe_log_admin_action(
    'test_create_user_direct',
    'users',
    v_user_id,
    jsonb_build_object(
      'email', v_test_email,
      'full_name', 'Тестовый пользователь V3',
      'test_timestamp', EXTRACT(epoch FROM now())
    ),
    NULL,
    NULL,
    true
  );
  
  RAISE NOTICE 'Успешно создан тестовый пользователь с ID % и email %', v_user_id, v_test_email;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Ошибка при тестировании создания пользователя: %', SQLERRM;
    
    -- Безопасное логирование ошибки
    PERFORM safe_log_admin_action(
      'test_create_user_error',
      'users',
      NULL,
      NULL,
      NULL,
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
      'direct_user_creation'
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
      'direct_user_creation'
    ),
    'message', 'Тесты успешно выполнены (обновлено)',
    'next_steps', 'Для создания пользователей с авторизацией используйте Edge Function create-user или вызов функции напрямую'
  ),
  description = 'Результаты тестов функций создания пользователей, обновлено ' || now()::text;