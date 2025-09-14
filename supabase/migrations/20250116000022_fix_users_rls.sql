-- Исправление RLS политик для таблицы users

-- 1. Включаем RLS для users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Удаляем старые политики
DROP POLICY IF EXISTS "users: read" ON public.users;
DROP POLICY IF EXISTS "users: update own" ON public.users;
DROP POLICY IF EXISTS "users: insert" ON public.users;

-- 3. Создаем новые политики
CREATE POLICY "users: read" ON public.users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users: update own" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users: insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';
