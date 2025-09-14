-- Создание таблицы user_test_attempts
-- Выполните в Supabase SQL Editor

-- 1. Создаём таблицу user_test_attempts
CREATE TABLE IF NOT EXISTS public.user_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  test_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'pending_review', 'reviewed', 'failed')),
  score integer DEFAULT 0,
  max_score integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  feedback text,
  answers jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Добавляем внешние ключи (только если их нет)
DO $$ 
BEGIN
    -- FK на users для user_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_test_attempts_user_id_fkey'
        ) THEN
            ALTER TABLE public.user_test_attempts 
            ADD CONSTRAINT user_test_attempts_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- FK на events для event_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_test_attempts_event_id_fkey'
        ) THEN
            ALTER TABLE public.user_test_attempts 
            ADD CONSTRAINT user_test_attempts_event_id_fkey 
            FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- FK на tests для test_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tests' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_test_attempts_test_id_fkey'
        ) THEN
            ALTER TABLE public.user_test_attempts 
            ADD CONSTRAINT user_test_attempts_test_id_fkey 
            FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE SET NULL;
        END IF;
    END IF;
    
    -- FK на users для reviewed_by
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'user_test_attempts_reviewed_by_fkey'
        ) THEN
            ALTER TABLE public.user_test_attempts 
            ADD CONSTRAINT user_test_attempts_reviewed_by_fkey 
            FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 2.5. Добавляем уникальное ограничение, если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_test_attempts_user_id_event_id_key'
    ) THEN
        ALTER TABLE public.user_test_attempts 
        ADD CONSTRAINT user_test_attempts_user_id_event_id_key 
        UNIQUE(user_id, event_id);
    END IF;
END $$;

-- 3. Создаём индексы
CREATE INDEX IF NOT EXISTS idx_user_test_attempts_user_id 
  ON public.user_test_attempts (user_id);

CREATE INDEX IF NOT EXISTS idx_user_test_attempts_event_id 
  ON public.user_test_attempts (event_id);

CREATE INDEX IF NOT EXISTS idx_user_test_attempts_status 
  ON public.user_test_attempts (status);

CREATE INDEX IF NOT EXISTS idx_user_test_attempts_test_id 
  ON public.user_test_attempts (test_id);

-- 4. Триггер для updated_at
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_user_test_attempts_touch ON public.user_test_attempts;
CREATE TRIGGER tg_user_test_attempts_touch
  BEFORE UPDATE ON public.user_test_attempts
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 5. Включаем RLS
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;

-- 6. Создаём RLS политики
-- Читать всем аутентифицированным
DROP POLICY IF EXISTS "user_test_attempts: read" ON public.user_test_attempts;
CREATE POLICY "user_test_attempts: read" ON public.user_test_attempts
  FOR SELECT TO authenticated
  USING (true);

-- Писать всем аутентифицированным (временно для тестирования)
DROP POLICY IF EXISTS "user_test_attempts: write" ON public.user_test_attempts;
CREATE POLICY "user_test_attempts: write" ON public.user_test_attempts
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Проверяем результат
SELECT 
  'user_test_attempts' as "Таблица",
  COUNT(*) as "Записей"
FROM public.user_test_attempts;

-- 8. Показываем структуру таблицы
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable",
  column_default as "По умолчанию"
FROM information_schema.columns 
WHERE table_name = 'user_test_attempts' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;

