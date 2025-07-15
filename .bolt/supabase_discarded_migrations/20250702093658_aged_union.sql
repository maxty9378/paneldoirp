/*
  # Улучшение системы администрирования

  1. Новые таблицы
    - `system_settings` - системные настройки
    - `admin_logs` - логи действий администратора  
    - `notification_tasks` - задачи и уведомления
  
  2. Расширение существующих таблиц
    - Добавление полей в `users`, `territories`, `positions`
    - Улучшение `user_activity_logs`
  
  3. Безопасность
    - RLS политики для всех новых таблиц
    - Функции для логирования и управления задачами
  
  4. Базовые данные
    - Системные настройки по умолчанию
    - Базовые должности и территории
*/

-- Системные настройки
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb,
  description text,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Логи администратора
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id) NOT NULL,
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Улучшенные логи активности пользователей
ALTER TABLE user_activity_logs ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE user_activity_logs ADD COLUMN IF NOT EXISTS ip_address inet;
ALTER TABLE user_activity_logs ADD COLUMN IF NOT EXISTS user_agent text;

-- Задачи и уведомления
CREATE TABLE IF NOT EXISTS notification_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  assigned_to uuid REFERENCES users(id),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date timestamptz,
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Добавляем новые поля в users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes text;

-- Добавляем поля в territories
ALTER TABLE territories ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE territories ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES users(id);
ALTER TABLE territories ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Добавляем поля в positions
ALTER TABLE positions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]';

-- Включаем RLS для новых таблиц
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tasks ENABLE ROW LEVEL SECURITY;

-- Политики для system_settings
CREATE POLICY "Administrators can manage system settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'administrator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'administrator'
    )
  );

-- Политики для admin_logs
CREATE POLICY "Administrators can view admin logs"
  ON admin_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator')
    )
  );

CREATE POLICY "Administrators can create admin logs"
  ON admin_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator', 'trainer')
    )
  );

-- Политики для notification_tasks
CREATE POLICY "Users can view their tasks"
  ON notification_tasks
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('administrator', 'moderator')
    )
  );

CREATE POLICY "Managers can create tasks"
  ON notification_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('supervisor', 'trainer', 'moderator', 'administrator')
    )
  );

CREATE POLICY "Users can update their tasks"
  ON notification_tasks
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = assigned_to OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('supervisor', 'trainer', 'moderator', 'administrator')
    )
  );

-- Функция для логирования действий администратора
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Функция для создания задач
CREATE OR REPLACE FUNCTION create_notification_task(
  p_user_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_type text DEFAULT 'general',
  p_priority text DEFAULT 'medium',
  p_due_date timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_id uuid;
BEGIN
  INSERT INTO notification_tasks (
    user_id,
    assigned_to,
    title,
    description,
    type,
    priority,
    due_date
  ) VALUES (
    p_user_id,
    auth.uid(),
    p_title,
    p_description,
    p_type,
    p_priority,
    p_due_date
  ) RETURNING id INTO task_id;
  
  RETURN task_id;
END;
$$;

-- Функция для обновления updated_at (если не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_tasks_updated_at ON notification_tasks;
CREATE TRIGGER update_notification_tasks_updated_at
  BEFORE UPDATE ON notification_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Вставляем базовые системные настройки (исправляем JSON формат)
INSERT INTO system_settings (key, value, description, category) VALUES
  ('email_notifications', 'true'::jsonb, 'Включить email уведомления', 'notifications'),
  ('max_file_size_mb', '10'::jsonb, 'Максимальный размер файла в МБ', 'uploads'),
  ('session_timeout_minutes', '60'::jsonb, 'Время сессии в минутах', 'security'),
  ('maintenance_mode', 'false'::jsonb, 'Режим обслуживания', 'system'),
  ('auto_backup', 'true'::jsonb, 'Автоматическое резервное копирование', 'system'),
  ('default_user_role', '"employee"'::jsonb, 'Роль пользователя по умолчанию', 'users'),
  ('password_min_length', '6'::jsonb, 'Минимальная длина пароля', 'security'),
  ('login_attempts_limit', '5'::jsonb, 'Максимальное количество попыток входа', 'security')
ON CONFLICT (key) DO NOTHING;

-- Создаем базовые должности если их нет
INSERT INTO positions (name, description, level, department) VALUES
  ('Администратор системы', 'Полный доступ к системе', 10, 'IT'),
  ('Менеджер', 'Управление командой', 7, 'Management'),
  ('Тренер', 'Проведение обучения', 6, 'Training'),
  ('Супервайзер', 'Надзор за операциями', 5, 'Operations'),
  ('Торговый представитель', 'Продажи и работа с клиентами', 3, 'Sales'),
  ('Сотрудник', 'Базовая должность', 1, 'General')
ON CONFLICT (name) DO NOTHING;

-- Создаем базовые территории если их нет
INSERT INTO territories (name, region, is_active) VALUES
  ('Центральный офис', 'Москва', true),
  ('Северо-Западный регион', 'Санкт-Петербург', true),
  ('Южный регион', 'Краснодар', true),
  ('Уральский регион', 'Екатеринбург', true),
  ('Сибирский регион', 'Новосибирск', true),
  ('Дальневосточный регион', 'Владивосток', true)
ON CONFLICT (name) DO NOTHING;