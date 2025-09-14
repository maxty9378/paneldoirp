-- Исправление RLS политик для trainer_territories
-- Выполните в Supabase SQL Editor

-- 1. Удаляем все существующие политики
DROP POLICY IF EXISTS "trainer_territories: read" ON public.trainer_territories;
DROP POLICY IF EXISTS "trainer_territories: write" ON public.trainer_territories;
DROP POLICY IF EXISTS "trainer_territories: insert" ON public.trainer_territories;
DROP POLICY IF EXISTS "trainer_territories: update" ON public.trainer_territories;
DROP POLICY IF EXISTS "trainer_territories: delete" ON public.trainer_territories;

-- 2. Временно отключаем RLS для тестирования
ALTER TABLE public.trainer_territories DISABLE ROW LEVEL SECURITY;

-- 3. Включаем RLS обратно
ALTER TABLE public.trainer_territories ENABLE ROW LEVEL SECURITY;

-- 4. Создаём простые разрешающие политики
-- Читать всем аутентифицированным
CREATE POLICY "trainer_territories: read" ON public.trainer_territories
  FOR SELECT TO authenticated
  USING (true);

-- Писать всем аутентифицированным (временно для тестирования)
CREATE POLICY "trainer_territories: write" ON public.trainer_territories
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Проверяем результат
SELECT 
  policyname as "Политика",
  cmd as "Команда",
  roles as "Роли"
FROM pg_policies 
WHERE tablename = 'trainer_territories' AND schemaname = 'public';

-- 6. Проверяем, что RLS включен
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS включен"
FROM pg_tables 
WHERE tablename = 'trainer_territories' AND schemaname = 'public';
