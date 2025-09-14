-- Исправление RLS политик для таблицы territories

-- 1. Включаем RLS для territories
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

-- 2. Удаляем старые политики
DROP POLICY IF EXISTS "territories: read" ON public.territories;

-- 3. Создаем новую политику
CREATE POLICY "territories: read" ON public.territories
  FOR SELECT TO authenticated
  USING (true);

-- 4. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';
