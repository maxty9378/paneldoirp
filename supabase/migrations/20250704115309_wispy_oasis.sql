/*
  # Исправление RLS политик для admin_logs
  
  1. Изменения
    - Удаление ограничительной политики INSERT
    - Создание новой, более гибкой политики INSERT
    - Обновление политики SELECT для admin_logs
  
  2. Безопасность
    - Разрешение системных операций (admin_id IS NULL)
    - Сохранение безопасности для пользовательских операций
    - Улучшение политики чтения
*/

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create admin logs" ON admin_logs;

-- Create new, more permissive INSERT policy for admin_logs
CREATE POLICY "Allow admin logs creation"
  ON admin_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if admin_id is NULL (system operations) 
    -- OR admin_id matches current user
    -- OR user has elevated permissions
    (admin_id IS NULL) 
    OR (admin_id = auth.uid()) 
    OR (EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = ANY (ARRAY[
        'administrator'::user_role_enum, 
        'moderator'::user_role_enum, 
        'trainer'::user_role_enum, 
        'expert'::user_role_enum
      ])
    ))
  );

-- Also ensure we have proper SELECT policy for admin_logs
DROP POLICY IF EXISTS "Administrators can view admin logs" ON admin_logs;

CREATE POLICY "Allow admin logs reading"
  ON admin_logs
  FOR SELECT
  TO authenticated
  USING (
    -- Allow administrators and moderators to view all logs
    -- Allow users to view logs where they are the admin_id
    (admin_id = auth.uid())
    OR (EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = ANY (ARRAY[
        'administrator'::user_role_enum, 
        'moderator'::user_role_enum
      ])
    ))
  );