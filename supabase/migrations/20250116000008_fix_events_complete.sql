-- Полное исправление таблицы events

-- 1. Конвертируем enum в text
ALTER TABLE public.events 
ALTER COLUMN status TYPE text USING status::text;

-- 2. Устанавливаем дефолтное значение
ALTER TABLE public.events 
ALTER COLUMN status SET DEFAULT 'draft';

-- 3. Обновляем RLS политики для events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "events: read" ON public.events;
DROP POLICY IF EXISTS "events: insert" ON public.events;
DROP POLICY IF EXISTS "events: update" ON public.events;
DROP POLICY IF EXISTS "events: delete" ON public.events;

-- Создаем новые политики
CREATE POLICY "events: read" ON public.events
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "events: insert" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "events: update" ON public.events
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "events: delete" ON public.events
  FOR DELETE TO authenticated
  USING (true);
