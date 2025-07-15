/*
# Исправление политики RLS для admin_logs

1. Изменения
  - Удалена строгая политика INSERT, требующая точного соответствия admin_id
  - Добавлена более гибкая политика, поддерживающая автоматическое логирование
  - Исправлены ссылки на функцию идентификатора пользователя

2. Security
  - Сохранено ограничение доступа только для пользователей с административными ролями
  - Разрешено автоматическое логирование с admin_id = NULL
*/

-- Удаляем существующую строгую политику INSERT
DROP POLICY IF EXISTS "Administrators can create admin logs" ON admin_logs;

-- Создаем новую, более гибкую политику INSERT
CREATE POLICY "Users can create admin logs" ON admin_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Разрешаем вставку если:
    -- 1. admin_id равен текущему пользователю (обычное логирование)
    -- 2. admin_id равен null (системное логирование через триггеры)
    -- 3. Пользователь имеет соответствующую роль
    (
      (admin_id IS NULL OR admin_id = auth.uid()) 
      AND 
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = ANY (ARRAY[
          'administrator'::user_role_enum, 
          'moderator'::user_role_enum, 
          'trainer'::user_role_enum,
          'expert'::user_role_enum
        ])
      )
    )
  );

-- Добавляем комментарий к политике
COMMENT ON POLICY "Users can create admin logs" ON admin_logs IS 
  'Разрешает пользователям с административными ролями создавать записи в логах. Поддерживает как ручное, так и автоматическое логирование через триггеры.';