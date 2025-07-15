-- Обновление функции rpc_create_user_safe для добавления параметра work_experience_days

-- Удаляем существующую функцию
DROP FUNCTION IF EXISTS rpc_create_user_safe;

-- Создаем обновленную функцию с параметром work_experience_days
CREATE OR REPLACE FUNCTION rpc_create_user_safe(
  p_full_name text,
  p_email text,
  p_role user_role_enum DEFAULT 'employee',
  p_sap_number text DEFAULT NULL,
  p_position_id uuid DEFAULT NULL,
  p_territory_id uuid DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT 'management_company',
  p_subdivision subdivision_enum DEFAULT 'management_company',
  p_branch_id uuid DEFAULT NULL,
  p_branch_subrole branch_subrole_enum DEFAULT NULL,
  p_work_experience_days integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
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

  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email обязателен для создания пользователя';
  END IF;

  -- Проверка на существование email или SAP номера
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Пользователь с таким email уже существует';
  END IF;
  
  IF p_sap_number IS NOT NULL AND p_sap_number != '' THEN
    IF EXISTS (SELECT 1 FROM users WHERE sap_number = p_sap_number) THEN
      RAISE EXCEPTION 'Пользователь с таким SAP номером уже существует';
    END IF;
  END IF;

  -- Генерируем UUID для нового пользователя
  v_user_id := gen_random_uuid();
  
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
    COALESCE(p_work_experience_days, 0)
  );
  
  -- Логируем создание пользователя
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    new_values,
    success
  ) VALUES (
    auth.uid(),
    'create_user_safe',
    'users',
    v_user_id,
    jsonb_build_object(
      'email', p_email,
      'full_name', p_full_name,
      'role', p_role,
      'sap_number', p_sap_number,
      'phone', p_phone,
      'territory_id', p_territory_id,
      'work_experience_days', p_work_experience_days
    ),
    true
  ) RETURNING id INTO v_log_id;
  
  -- Возвращаем результат
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Пользователь успешно создан в базе данных. Для входа в систему создайте запись в auth через edge-функцию.',
    'user', jsonb_build_object(
      'id', v_user_id,
      'email', p_email,
      'sap_number', p_sap_number,
      'full_name', p_full_name,
      'role', p_role,
      'territory_id', p_territory_id,
      'phone', p_phone,
      'work_experience_days', p_work_experience_days
    )
  );
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
$$;

-- Выдаем права на выполнение функции
GRANT EXECUTE ON FUNCTION rpc_create_user_safe TO authenticated;

-- Добавление записи о изменениях в system_settings
INSERT INTO system_settings (
  key,
  value,
  description,
  category
)
VALUES (
  'migration_add_work_experience_param',
  jsonb_build_object(
    'timestamp', EXTRACT(epoch FROM now()),
    'date', now(),
    'changes', 'Добавлен параметр work_experience_days в функцию rpc_create_user_safe',
    'status', 'completed'
  ),
  'Миграция: добавление параметра стажа работы в функцию создания пользователя',
  'migrations'
)
ON CONFLICT (key)
DO UPDATE SET
  value = jsonb_build_object(
    'timestamp', EXTRACT(epoch FROM now()),
    'date', now(),
    'changes', 'Обновлен параметр work_experience_days в функции rpc_create_user_safe',
    'status', 'updated'
  ),
  updated_at = now();