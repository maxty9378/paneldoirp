-- Исправление таблицы notification_tasks

-- Проверяем существование таблицы
CREATE TABLE IF NOT EXISTS public.notification_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Добавляем недостающие колонки, если их нет
ALTER TABLE public.notification_tasks
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'info';

ALTER TABLE public.notification_tasks
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

ALTER TABLE public.notification_tasks
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

ALTER TABLE public.notification_tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Включаем RLS
ALTER TABLE public.notification_tasks ENABLE ROW LEVEL SECURITY;

-- Создаем политики
DROP POLICY IF EXISTS "notification_tasks: read" ON public.notification_tasks;
CREATE POLICY "notification_tasks: read" ON public.notification_tasks
  FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('administrator', 'moderator')
  ));

DROP POLICY IF EXISTS "notification_tasks: insert" ON public.notification_tasks;
CREATE POLICY "notification_tasks: insert" ON public.notification_tasks
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "notification_tasks: update" ON public.notification_tasks;
CREATE POLICY "notification_tasks: update" ON public.notification_tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('administrator', 'moderator')
  ))
  WITH CHECK (true);

-- Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';
