-- Создаем функцию для тестового просмотра пользователей
-- Эта функция доступна для публичного использования только на странице /test-users

CREATE OR REPLACE FUNCTION get_test_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  sap_number text,
  phone text,
  role text,
  subdivision text,
  branch_subrole text,
  position text,
  department text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.sap_number,
    u.phone,
    u.role::text,
    u.subdivision::text,
    u.branch_subrole::text,
    u.position,
    u.department,
    u.is_active,
    u.created_at,
    u.updated_at
  FROM users u
  ORDER BY u.full_name
  LIMIT 50;
END;
$$;

-- Даем права на выполнение функции всем (включая анонимных пользователей)
GRANT EXECUTE ON FUNCTION get_test_users() TO public;
GRANT EXECUTE ON FUNCTION get_test_users() TO anon;
GRANT EXECUTE ON FUNCTION get_test_users() TO authenticated;

-- Комментарий к функции
COMMENT ON FUNCTION get_test_users() IS 'Функция для тестового просмотра пользователей. Доступна публично только для страницы /test-users';
