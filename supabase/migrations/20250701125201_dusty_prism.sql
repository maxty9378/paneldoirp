/*
  # Исправление проблем с авторизацией

  1. Удаление всех проблемных политик
  2. Создание простых политик без рекурсии
  3. Обеспечение корректной работы авторизации
*/

-- Удаляем все существующие политики для users
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Administrators can read all users" ON users;
DROP POLICY IF EXISTS "Trainers can read branch users" ON users;
DROP POLICY IF EXISTS "Trainers can read their branch users" ON users;

-- Создаем простые политики без рекурсии
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Политика для администраторов - проверяем роль через auth.users
CREATE POLICY "Administrators can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'administrator'
    )
  );

-- Политика для тренеров и модераторов
CREATE POLICY "Trainers can read users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' IN ('trainer', 'administrator', 'moderator')
    )
  );

-- Политики для создания и обновления пользователей
CREATE POLICY "Administrators can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'administrator'
    )
  );

CREATE POLICY "Administrators can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'administrator'
    )
  );

-- Разрешаем пользователям обновлять свой профиль
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);