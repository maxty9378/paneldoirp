/*
  # Система администрирования

  1. Новые таблицы
    - `system_settings` - системные настройки
    - `admin_logs` - логи действий администраторов  
    - `notification_tasks` - задачи и уведомления

  2. Улучшения существующих таблиц
    - Добавлены новые поля в users, territories, positions
    - Улучшены логи активности пользователей

  3. Безопасность
    - RLS политики для всех новых таблиц
    - Функции для логирования и создания задач
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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity_logs' AND column_name = 'session_id') THEN
    ALTER TABLE user_activity_logs ADD COLUMN session_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity_logs' AND column_name = 'ip_address') THEN
    ALTER TABLE user_activity_logs ADD COLUMN ip_address inet;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_activity_logs' AND column_name = 'user_agent') THEN
    ALTER TABLE user_activity_logs ADD COLUMN user_agent text;
  END IF;
END $$;

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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_activity_at') THEN
    ALTER TABLE users ADD COLUMN last_activity_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_changed_at') THEN
    ALTER TABLE users ADD COLUMN password_changed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
    ALTER TABLE users ADD COLUMN failed_login_attempts integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'locked_until') THEN
    ALTER TABLE users ADD COLUMN locked_until timestamptz;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'preferences') THEN
    ALTER TABLE users ADD COLUMN preferences jsonb DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notes') THEN
    ALTER TABLE users ADD COLUMN notes text;
  END IF;
END $$;

-- Добавляем поля в territories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'is_active') THEN
    ALTER TABLE territories ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'manager_id') THEN
    ALTER TABLE territories ADD COLUMN manager_id uuid REFERENCES users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'territories' AND column_name = 'metadata') THEN
    ALTER TABLE territories ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- Добавляем поля в positions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'is_active') THEN
    ALTER TABLE positions ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'level') THEN
    ALTER TABLE positions ADD COLUMN level integer DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'department') THEN
    ALTER TABLE positions ADD COLUMN department text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'permissions') THEN
    ALTER TABLE positions ADD COLUMN permissions jsonb DEFAULT '[]';
  END IF;
END $$;

-- Включаем RLS для новых таблиц
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tasks ENABLE ROW LEVEL SECURITY;

-- Политики для system_settings
DROP POLICY IF EXISTS "Administrators can manage system settings" ON system_settings;
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
DROP POLICY IF EXISTS "Administrators can view admin logs" ON admin_logs;
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

DROP POLICY IF EXISTS "Administrators can create admin logs" ON admin_logs;
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
DROP POLICY IF EXISTS "Users can view their tasks" ON notification_tasks;
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

DROP POLICY IF EXISTS "Managers can create tasks" ON notification_tasks;
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

DROP POLICY IF EXISTS "Users can update their tasks" ON notification_tasks;
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

-- Вставляем базовые системные настройки (используем WHERE NOT EXISTS)
INSERT INTO system_settings (key, value, description, category)
SELECT 'email_notifications', 'true'::jsonb, 'Включить email уведомления', 'notifications'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'email_notifications');

INSERT INTO system_settings (key, value, description, category)
SELECT 'max_file_size_mb', '10'::jsonb, 'Максимальный размер файла в МБ', 'uploads'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'max_file_size_mb');

INSERT INTO system_settings (key, value, description, category)
SELECT 'session_timeout_minutes', '60'::jsonb, 'Время сессии в минутах', 'security'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'session_timeout_minutes');

INSERT INTO system_settings (key, value, description, category)
SELECT 'maintenance_mode', 'false'::jsonb, 'Режим обслуживания', 'system'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'maintenance_mode');

INSERT INTO system_settings (key, value, description, category)
SELECT 'auto_backup', 'true'::jsonb, 'Автоматическое резервное копирование', 'system'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'auto_backup');

INSERT INTO system_settings (key, value, description, category)
SELECT 'default_user_role', '"employee"'::jsonb, 'Роль пользователя по умолчанию', 'users'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'default_user_role');

INSERT INTO system_settings (key, value, description, category)
SELECT 'password_min_length', '6'::jsonb, 'Минимальная длина пароля', 'security'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'password_min_length');

INSERT INTO system_settings (key, value, description, category)
SELECT 'login_attempts_limit', '5'::jsonb, 'Максимальное количество попыток входа', 'security'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'login_attempts_limit');

-- Создаем базовые должности (используем WHERE NOT EXISTS)
INSERT INTO positions (name, description, level, department)
SELECT 'Администратор системы', 'Полный доступ к системе', 10, 'IT'
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Администратор системы');

INSERT INTO positions (name, description, level, department)
SELECT 'Менеджер', 'Управление командой', 7, 'Management'
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Менеджер');

INSERT INTO positions (name, description, level, department)
SELECT 'Тренер', 'Проведение обучения', 6, 'Training'
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Тренер');

INSERT INTO positions (name, description, level, department)
SELECT 'Супервайзер', 'Надзор за операциями', 5, 'Operations'
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Супервайзер');

INSERT INTO positions (name, description, level, department)
SELECT 'Торговый представитель', 'Продажи и работа с клиентами', 3, 'Sales'
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Торговый представитель');

INSERT INTO positions (name, description, level, department)
SELECT 'Сотрудник', 'Базовая должность', 1, 'General'
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Сотрудник');

-- Создаем базовые территории (используем WHERE NOT EXISTS)
INSERT INTO territories (name, region, is_active)
SELECT 'Центральный офис', 'Москва', true
WHERE NOT EXISTS (SELECT 1 FROM territories WHERE name = 'Центральный офис');

INSERT INTO territories (name, region, is_active)
SELECT 'Северо-Западный регион', 'Санкт-Петербург', true
WHERE NOT EXISTS (SELECT 1 FROM territories WHERE name = 'Северо-Западный регион');

INSERT INTO territories (name, region, is_active)
SELECT 'Южный регион', 'Краснодар', true
WHERE NOT EXISTS (SELECT 1 FROM territories WHERE name = 'Южный регион');

INSERT INTO territories (name, region, is_active)
SELECT 'Уральский регион', 'Екатеринбург', true
WHERE NOT EXISTS (SELECT 1 FROM territories WHERE name = 'Уральский регион');

INSERT INTO territories (name, region, is_active)
SELECT 'Сибирский регион', 'Новосибирск', true
WHERE NOT EXISTS (SELECT 1 FROM territories WHERE name = 'Сибирский регион');

INSERT INTO territories (name, region, is_active)
SELECT 'Дальневосточный регион', 'Владивосток', true
WHERE NOT EXISTS (SELECT 1 FROM territories WHERE name = 'Дальневосточный регион');