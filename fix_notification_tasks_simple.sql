-- Простое исправление таблицы notification_tasks - оставляем priority как text

-- 1. Добавляем недостающие колонки, если их нет
ALTER TABLE public.notification_tasks
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Индексы
CREATE INDEX IF NOT EXISTS idx_nt_assigned_to ON public.notification_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_nt_event ON public.notification_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_nt_status ON public.notification_tasks(status);

-- 3. updated_at-триггер
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_notification_tasks_touch ON public.notification_tasks;
CREATE TRIGGER tg_notification_tasks_touch
BEFORE UPDATE ON public.notification_tasks
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 4. RLS политики
ALTER TABLE public.notification_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_tasks: read own/admin/mod" ON public.notification_tasks;
CREATE POLICY "notification_tasks: read own/admin/mod" ON public.notification_tasks
FOR SELECT TO authenticated
USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('administrator','moderator'))
);

DROP POLICY IF EXISTS "notification_tasks: insert by privileged" ON public.notification_tasks;
CREATE POLICY "notification_tasks: insert by privileged" ON public.notification_tasks
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('trainer','moderator','administrator'))
);

DROP POLICY IF EXISTS "notification_tasks: update own/admin/mod" ON public.notification_tasks;
CREATE POLICY "notification_tasks: update own/admin/mod" ON public.notification_tasks
FOR UPDATE TO authenticated
USING (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('administrator','moderator'))
)
WITH CHECK (
  assigned_to = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('administrator','moderator'))
);

-- 5. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';

-- 6. Проверяем результат
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'notification_tasks' 
ORDER BY ordinal_position;
