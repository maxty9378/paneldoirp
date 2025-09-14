-- Исправление структуры таблицы events - добавление недостающих колонок

-- Добавляем колонку location, если её нет
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS location text;

-- Добавляем колонку meeting_link, если её нет
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS meeting_link text;

-- Добавляем колонку points, если её нет
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS points integer DEFAULT 0;

-- Добавляем колонку max_participants, если её нет
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS max_participants integer;

-- Добавляем колонку status, если её нет
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Добавляем колонку creator_id, если её нет
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES public.users(id);

-- Обновляем RLS политики для events
DROP POLICY IF EXISTS "events: read" ON public.events;
CREATE POLICY "events: read" ON public.events
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "events: insert" ON public.events;
CREATE POLICY "events: insert" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "events: update" ON public.events;
CREATE POLICY "events: update" ON public.events
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "events: delete" ON public.events;
CREATE POLICY "events: delete" ON public.events
  FOR DELETE TO authenticated
  USING (true);
