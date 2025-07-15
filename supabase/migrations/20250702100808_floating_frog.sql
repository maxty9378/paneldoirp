/*
# Добавление политик RLS для пользователей

1. Новые политики
   - Добавление политики чтения для всех пользователей
   - Добавление политики для обновления и удаления пользователей администраторами

2. Безопасность
   - Разрешение чтения данных пользователей для всех аутентифицированных пользователей
   - Ограничение модификации данных только для администраторов

3. Изменения
   - Сохранение существующих политик
   - Добавление новых политик для улучшения работы с пользовательскими данными
*/

-- Добавление политики для чтения пользователей для всех аутентифицированных пользователей
DROP POLICY IF EXISTS "Allow all users to read users" ON users;
CREATE POLICY "Allow all users to read users" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Добавление политики для обновления пользователей администраторами
DROP POLICY IF EXISTS "Administrators can update users" ON users;
CREATE POLICY "Administrators can update users" ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator')
    )
  );

-- Добавление политики для удаления пользователей администраторами
DROP POLICY IF EXISTS "Administrators can delete users" ON users;
CREATE POLICY "Administrators can delete users" ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator')
    )
  );

-- Добавление политики для создания пользователей администраторами
DROP POLICY IF EXISTS "Administrators can create users" ON users;
CREATE POLICY "Administrators can create users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator')
    )
  );