-- Полное исправление таблиц trainer_territories и trainer_territories_log
-- Выполните в Supabase SQL Editor

-- 1. Создаём таблицу trainer_territories
CREATE TABLE IF NOT EXISTS public.trainer_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  territory_id uuid NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Добавляем уникальное ограничение, если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_territories_trainer_id_territory_id_key'
    ) THEN
        ALTER TABLE public.trainer_territories 
        ADD CONSTRAINT trainer_territories_trainer_id_territory_id_key 
        UNIQUE(trainer_id, territory_id);
    END IF;
END $$;

-- 2. Добавляем внешние ключи для trainer_territories
DO $$ 
BEGIN
    -- FK на users для trainer_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'trainer_territories_trainer_id_fkey'
        ) THEN
            ALTER TABLE public.trainer_territories 
            ADD CONSTRAINT trainer_territories_trainer_id_fkey 
            FOREIGN KEY (trainer_id) REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    -- FK на territories для territory_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'territories' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'trainer_territories_territory_id_fkey'
        ) THEN
            ALTER TABLE public.trainer_territories 
            ADD CONSTRAINT trainer_territories_territory_id_fkey 
            FOREIGN KEY (territory_id) REFERENCES public.territories(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 3. Создаём индексы для trainer_territories
CREATE INDEX IF NOT EXISTS idx_trainer_territories_trainer_id 
  ON public.trainer_territories (trainer_id);

CREATE INDEX IF NOT EXISTS idx_trainer_territories_territory_id 
  ON public.trainer_territories (territory_id);

CREATE INDEX IF NOT EXISTS idx_trainer_territories_is_active 
  ON public.trainer_territories (is_active);

-- 4. Триггер для updated_at в trainer_territories
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_trainer_territories_touch ON public.trainer_territories;
CREATE TRIGGER tg_trainer_territories_touch
  BEFORE UPDATE ON public.trainer_territories
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 5. RLS для trainer_territories
ALTER TABLE public.trainer_territories ENABLE ROW LEVEL SECURITY;

-- Читать всем аутентифицированным
DROP POLICY IF EXISTS "trainer_territories: read" ON public.trainer_territories;
CREATE POLICY "trainer_territories: read" ON public.trainer_territories
  FOR SELECT TO authenticated
  USING (true);

-- Писать всем аутентифицированным (временно для тестирования)
DROP POLICY IF EXISTS "trainer_territories: write" ON public.trainer_territories;
CREATE POLICY "trainer_territories: write" ON public.trainer_territories
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Исправляем trainer_territories_log - добавляем недостающие колонки
DO $$ 
BEGIN
    -- Добавляем new_values, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_territories_log' 
        AND column_name = 'new_values' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.trainer_territories_log ADD COLUMN new_values jsonb DEFAULT '{}';
        RAISE NOTICE 'Колонка new_values добавлена в trainer_territories_log';
    END IF;
    
    -- Добавляем old_values, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_territories_log' 
        AND column_name = 'old_values' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.trainer_territories_log ADD COLUMN old_values jsonb DEFAULT '{}';
        RAISE NOTICE 'Колонка old_values добавлена в trainer_territories_log';
    END IF;
END $$;

-- 7. Обновляем внешние ключи для trainer_territories_log
DO $$ 
BEGIN
    -- FK на trainer_territories для trainer_territory_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainer_territories' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'trainer_territories_log_trainer_territory_id_fkey'
        ) THEN
            ALTER TABLE public.trainer_territories_log 
            ADD CONSTRAINT trainer_territories_log_trainer_territory_id_fkey 
            FOREIGN KEY (trainer_territory_id) REFERENCES public.trainer_territories(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 8. Проверяем результат
SELECT 
  'trainer_territories' as "Таблица",
  COUNT(*) as "Записей"
FROM public.trainer_territories;

SELECT 
  'trainer_territories_log' as "Таблица",
  COUNT(*) as "Записей"
FROM public.trainer_territories_log;

-- 9. Показываем структуру trainer_territories_log
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable"
FROM information_schema.columns 
WHERE table_name = 'trainer_territories_log' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;
