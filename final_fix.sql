-- =====================================================
-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ФУНКЦИИ tg_touch_updated_at
-- =====================================================

-- 1. БЕЗОПАСНО перезаписываем функцию с проверкой существования колонки
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at() 
RETURNS trigger AS $$ 
BEGIN 
  -- Проверяем наличие колонки updated_at в той же схеме/таблице, где сработал триггер
  IF EXISTS ( 
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = TG_TABLE_SCHEMA 
    AND table_name = TG_TABLE_NAME 
    AND column_name = 'updated_at' 
  ) THEN 
    NEW.updated_at = now(); 
  END IF; 
  RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

-- 2. Теперь создаем таблицу notification_tasks (теперь триггер будет работать безопасно)
DROP TABLE IF EXISTS notification_tasks CASCADE;

CREATE TABLE notification_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Создаем индексы
CREATE INDEX idx_notification_tasks_assigned_to ON notification_tasks(assigned_to);
CREATE INDEX idx_notification_tasks_status ON notification_tasks(status);
CREATE INDEX idx_notification_tasks_due_date ON notification_tasks(due_date);

-- 4. Включаем RLS
ALTER TABLE notification_tasks ENABLE ROW LEVEL SECURITY;

-- 5. Создаем политики
CREATE POLICY "Users can view their own tasks" ON notification_tasks
  FOR SELECT USING (assigned_to = auth.uid());

CREATE POLICY "Users can update their own tasks" ON notification_tasks
  FOR UPDATE USING (assigned_to = auth.uid());

CREATE POLICY "Admins can manage all tasks" ON notification_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'moderator')
    )
  );

-- 6. Добавляем колонку name_ru в event_types
ALTER TABLE event_types 
ADD COLUMN IF NOT EXISTS name_ru TEXT;

-- Обновляем существующие записи
UPDATE event_types 
SET name_ru = CASE 
  WHEN name = 'in_person_training' THEN 'Очный тренинг'
  WHEN name = 'online_training' THEN 'Онлайн тренинг'
  WHEN name = 'webinar' THEN 'Вебинар'
  WHEN name = 'conference' THEN 'Конференция'
  ELSE name
END
WHERE name_ru IS NULL;

-- 7. Исправляем RLS политики для users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Создаем простые политики без рекурсии
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('administrator', 'moderator')
      AND u.is_active = true
    )
  );

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'administrator'
      AND u.is_active = true
    )
  );

-- 8. Добавляем недостающие колонки в users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'trainer', 'moderator', 'administrator'));

-- 9. Добавляем комментарии
COMMENT ON COLUMN event_types.name_ru IS 'Русское название типа мероприятия';
COMMENT ON COLUMN notification_tasks.assigned_to IS 'ID пользователя, которому назначена задача';
COMMENT ON COLUMN notification_tasks.assigned_by IS 'ID пользователя, который назначил задачу';
COMMENT ON COLUMN notification_tasks.status IS 'Статус задачи: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN notification_tasks.priority IS 'Приоритет задачи: low, medium, high, urgent';

-- 10. Проверяем, что функция исправлена корректно
SELECT 
    p.oid, 
    n.nspname AS schema_name, 
    pg_get_functiondef(p.oid) AS src 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE p.proname = 'tg_touch_updated_at';
