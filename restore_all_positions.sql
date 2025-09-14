-- ===== ВОССТАНОВЛЕНИЕ ВСЕХ ДОЛЖНОСТЕЙ SNS =====
-- Создаёт таблицу positions и добавляет все найденные должности
-- Выполните в Supabase SQL Editor

-- 1. Создаём таблицу positions (если не существует)
CREATE TABLE IF NOT EXISTS public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  level integer,
  department text,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаём уникальный индекс на name (если не существует)
CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_name_unique ON public.positions (name);

-- 2. Триггер для updated_at
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_positions_touch ON public.positions;
CREATE TRIGGER tg_positions_touch
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 3. RLS политики
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Читать всем аутентифицированным
DROP POLICY IF EXISTS "positions: read" ON public.positions;
CREATE POLICY "positions: read" ON public.positions
  FOR SELECT TO authenticated
  USING (true);

-- Писать только администраторам и модераторам
DROP POLICY IF EXISTS "positions: write by admin/moderator" ON public.positions;
CREATE POLICY "positions: write by admin/moderator" ON public.positions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('administrator','moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('administrator','moderator')
    )
  );

-- 4. Добавляем ВСЕ найденные должности

-- Основные должности (из миграций и restore_data.sql)
INSERT INTO public.positions (name, description, is_active, level, department, permissions) VALUES
  ('Тренер СПП', 'Обучение и развитие сотрудников', true, 1, 'Training', '[]'),
  ('Директор филиала', 'Управление филиалом компании', true, 1, 'Management', '[]'),
  ('Администратор системы', 'Администрирование портала обучения', true, 1, 'IT', '[]'),
  ('Супервайзер', 'Управление командой торговых представителей', true, 1, 'Sales', '[]'),
  ('Торговый представитель', 'Работа с клиентами и продажи', true, 1, 'Sales', '[]'),
  ('Менеджер', 'Управление командой', true, 7, 'Management', '[]'),
  ('Сотрудник', 'Базовая должность', true, 1, 'General', '[]')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = true,
  level = EXCLUDED.level,
  department = EXCLUDED.department,
  updated_at = now();

-- Дополнительные должности (из кода и интерфейса)
INSERT INTO public.positions (name, description, is_active, level, department, permissions) VALUES
  ('Тренер', 'Проведение обучения', true, 6, 'Training', '[]'),
  ('Специалист', 'Квалифицированный специалист', true, 2, 'General', '[]')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = true,
  level = EXCLUDED.level,
  department = EXCLUDED.department,
  updated_at = now();

-- Специфичные должности (из примеров данных)
INSERT INTO public.positions (name, description, is_active, level, department, permissions) VALUES
  ('Торговый представитель УДФ', 'Специализация торгового представителя', true, 2, 'Sales', '[]')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = true,
  level = EXCLUDED.level,
  department = EXCLUDED.department,
  updated_at = now();

-- 5. Проверяем результат
SELECT 
  name as "Должность",
  description as "Описание", 
  level as "Уровень",
  department as "Отдел",
  is_active as "Активна"
FROM public.positions 
ORDER BY level DESC, name;

-- 6. Статистика
SELECT 
  COUNT(*) as "Всего должностей",
  COUNT(*) FILTER (WHERE is_active = true) as "Активных",
  COUNT(DISTINCT department) as "Отделов"
FROM public.positions;
