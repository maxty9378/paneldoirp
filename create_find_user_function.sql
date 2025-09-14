-- Создание RPC функции для поиска пользователя по email
-- Выполните этот скрипт в Supabase Dashboard SQL Editor

CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email text)
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role user_role_enum,
  sap_number text,
  phone text,
  territory_id uuid,
  branch_id uuid,
  position_id uuid,
  work_experience_days integer,
  subdivision subdivision_enum,
  status user_status_enum,
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
    u.role,
    u.sap_number,
    u.phone,
    u.territory_id,
    u.branch_id,
    u.position_id,
    u.work_experience_days,
    u.subdivision,
    u.status,
    u.is_active,
    u.created_at,
    u.updated_at
  FROM public.users u
  WHERE u.email = p_email;
END;
$$;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;
