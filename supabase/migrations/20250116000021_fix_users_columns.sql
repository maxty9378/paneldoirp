-- Исправление недостающих колонок в таблице users

-- 1. Добавляем недостающие колонки в таблицу users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);

-- 2. Проверяем существование таблицы branches, если её нет - создаем
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Включаем RLS для branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- 4. Создаем политики для branches
DROP POLICY IF EXISTS "branches: read" ON public.branches;
CREATE POLICY "branches: read" ON public.branches
  FOR SELECT TO authenticated
  USING (true);

-- 5. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';
