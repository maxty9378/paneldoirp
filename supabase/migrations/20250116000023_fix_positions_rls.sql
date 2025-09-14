-- Исправление RLS политик для таблицы positions

-- 1. Включаем RLS для positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- 2. Удаляем старые политики
DROP POLICY IF EXISTS "positions: read" ON public.positions;

-- 3. Создаем новую политику
CREATE POLICY "positions: read" ON public.positions
  FOR SELECT TO authenticated
  USING (true);

-- 4. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';
