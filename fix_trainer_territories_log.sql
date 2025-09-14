-- Исправление таблицы trainer_territories_log
-- Выполните в Supabase SQL Editor

-- 1. Проверяем текущую структуру таблицы
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'trainer_territories_log' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;

-- 2. Создаём таблицу, если её нет
CREATE TABLE IF NOT EXISTS public.trainer_territories_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_territory_id uuid,
  trainer_id uuid NOT NULL,
  territory_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid NOT NULL,
  performed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 3. Добавляем недостающие колонки
DO $$ 
BEGIN
    -- Добавляем trainer_territory_id, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_territories_log' 
        AND column_name = 'trainer_territory_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.trainer_territories_log ADD COLUMN trainer_territory_id uuid;
        RAISE NOTICE 'Колонка trainer_territory_id добавлена';
    END IF;
    
    -- Добавляем performed_at, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_territories_log' 
        AND column_name = 'performed_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.trainer_territories_log ADD COLUMN performed_at timestamptz DEFAULT now();
        RAISE NOTICE 'Колонка performed_at добавлена';
    END IF;
    
    -- Добавляем metadata, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_territories_log' 
        AND column_name = 'metadata' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.trainer_territories_log ADD COLUMN metadata jsonb DEFAULT '{}';
        RAISE NOTICE 'Колонка metadata добавлена';
    END IF;
END $$;


-- 4. Добавляем внешние ключи, если их нет
DO $$ 
BEGIN
    -- Добавляем FK на trainer_territories, если таблица существует И колонка trainer_territory_id существует
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainer_territories' AND table_schema = 'public') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trainer_territories_log' AND column_name = 'trainer_territory_id' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'trainer_territories_log_trainer_territory_id_fkey'
        ) THEN
            ALTER TABLE public.trainer_territories_log 
            ADD CONSTRAINT trainer_territories_log_trainer_territory_id_fkey 
            FOREIGN KEY (trainer_territory_id) REFERENCES public.trainer_territories(id) ON DELETE SET NULL;
        END IF;
    END IF;
    
    -- Добавляем FK на users для trainer_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_territories_log_trainer_id_fkey'
    ) THEN
        ALTER TABLE public.trainer_territories_log 
        ADD CONSTRAINT trainer_territories_log_trainer_id_fkey 
        FOREIGN KEY (trainer_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Добавляем FK на territories для territory_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_territories_log_territory_id_fkey'
    ) THEN
        ALTER TABLE public.trainer_territories_log 
        ADD CONSTRAINT trainer_territories_log_territory_id_fkey 
        FOREIGN KEY (territory_id) REFERENCES public.territories(id) ON DELETE CASCADE;
    END IF;
    
    -- Добавляем FK на users для performed_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_territories_log_performed_by_fkey'
    ) THEN
        ALTER TABLE public.trainer_territories_log 
        ADD CONSTRAINT trainer_territories_log_performed_by_fkey 
        FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Добавляем CHECK constraint для action
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_territories_log_action_check'
    ) THEN
        ALTER TABLE public.trainer_territories_log 
        ADD CONSTRAINT trainer_territories_log_action_check 
        CHECK (action IN ('assigned', 'unassigned', 'activated', 'deactivated', 'deleted'));
    END IF;
END $$;

-- 6. Создаём индексы
CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_trainer_id 
  ON public.trainer_territories_log (trainer_id);

CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_territory_id 
  ON public.trainer_territories_log (territory_id);

CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_performed_at 
  ON public.trainer_territories_log (performed_at DESC);

-- 7. Включаем RLS
ALTER TABLE public.trainer_territories_log ENABLE ROW LEVEL SECURITY;

-- 8. Создаём RLS политики
DROP POLICY IF EXISTS "trainer_territories_log: read" ON public.trainer_territories_log;
CREATE POLICY "trainer_territories_log: read" ON public.trainer_territories_log
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "trainer_territories_log: write" ON public.trainer_territories_log;
CREATE POLICY "trainer_territories_log: write" ON public.trainer_territories_log
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('administrator','moderator','trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('administrator','moderator','trainer')
    )
  );

-- 9. Проверяем финальную структуру
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable",
  column_default as "По умолчанию"
FROM information_schema.columns 
WHERE table_name = 'trainer_territories_log' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;
