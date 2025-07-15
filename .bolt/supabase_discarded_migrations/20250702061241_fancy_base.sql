/*
  # Исправление политик RLS для таблицы users

  1. Изменения
    - Временно ослабляем политики RLS для таблицы users, чтобы разрешить чтение всех пользователей
    - Добавляем политику для чтения всех пользователей аутентифицированными пользователями
    - Обновляем существующие политики для обеспечения корректной работы

  2. Безопасность
    - Это временное изменение для отладки, в продакшене следует использовать более строгие политики
*/

-- Временно упрощаем политики RLS для таблицы users
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики для users
DROP POLICY IF EXISTS "Administrators can insert users" ON users;
DROP POLICY IF EXISTS "Administrators can read all users" ON users;
DROP POLICY IF EXISTS "Administrators can update users" ON users;
DROP POLICY IF EXISTS "Trainers can read users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Добавляем новую политику, разрешающую всем аутентифицированным пользователям читать всех пользователей
CREATE POLICY "Authenticated users can read all users" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Восстанавливаем политику для обновления собственного профиля
CREATE POLICY "Users can update own profile" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (uid() = id)
  WITH CHECK (uid() = id);

-- Восстанавливаем политику для вставки пользователей администраторами
CREATE POLICY "Administrators can insert users" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = uid() AND (au.raw_user_meta_data->>'role')::text = 'administrator'
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = uid() AND u.role = 'administrator'
    )
  );

-- Восстанавливаем политику для обновления пользователей администраторами
CREATE POLICY "Administrators can update users" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = uid() AND (au.raw_user_meta_data->>'role')::text = 'administrator'
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = uid() AND u.role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = uid() AND (au.raw_user_meta_data->>'role')::text = 'administrator'
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = uid() AND u.role = 'administrator'
    )
  );

-- Добавляем индекс для ускорения поиска по email
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);