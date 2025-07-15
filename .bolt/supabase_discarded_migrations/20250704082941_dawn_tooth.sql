/*
  # Исправление политики RLS для admin_logs

  1. Проблема
     - Текущая политика INSERT для admin_logs слишком строгая
     - Требует uid() = admin_id, что не работает при автоматическом логировании
     - Блокирует создание мероприятий через триггеры

  2. Решение
     - Обновляем политику INSERT для admin_logs
     - Разрешаем вставку записей пользователям с соответствующими ролями
     - Убираем требование uid() = admin_id для автоматического логирования

  3. Безопасность
     - Сохраняем ограничения по ролям
     - Добавляем проверку, что admin_id либо равен uid(), либо null (для системных записей)
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
      (admin_id IS NULL OR admin_id = uid()) 
      AND 
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = uid() 
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