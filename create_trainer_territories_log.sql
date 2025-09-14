-- Создание таблицы trainer_territories_log
-- Выполните в Supabase SQL Editor

-- 1. Создаём таблицу trainer_territories_log
CREATE TABLE IF NOT EXISTS public.trainer_territories_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_territory_id uuid REFERENCES public.trainer_territories(id) ON DELETE SET NULL,
  trainer_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  territory_id uuid REFERENCES public.territories(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN ('assigned', 'unassigned', 'activated', 'deactivated', 'deleted')),
  performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  performed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 2. Добавляем недостающие колонки, если их нет
DO $$ 
BEGIN
    -- Добавляем performed_at, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_territories_log' 
        AND column_name = 'performed_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.trainer_territories_log ADD COLUMN performed_at timestamptz DEFAULT now();
    END IF;
    
    -- Добавляем metadata, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_territories_log' 
        AND column_name = 'metadata' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.trainer_territories_log ADD COLUMN metadata jsonb DEFAULT '{}';
    END IF;
END $$;

-- 3. Создаём индексы для производительности
CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_trainer_id 
  ON public.trainer_territories_log (trainer_id);

CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_territory_id 
  ON public.trainer_territories_log (territory_id);

CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_performed_at 
  ON public.trainer_territories_log (performed_at DESC);

-- 4. Включаем RLS
ALTER TABLE public.trainer_territories_log ENABLE ROW LEVEL SECURITY;

-- 5. Создаём RLS политики
-- Читать всем аутентифицированным
DROP POLICY IF EXISTS "trainer_territories_log: read" ON public.trainer_territories_log;
CREATE POLICY "trainer_territories_log: read" ON public.trainer_territories_log
  FOR SELECT TO authenticated
  USING (true);

-- Писать только администраторам, модераторам и тренерам
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

-- 6. Проверяем результат
SELECT 
  'trainer_territories_log' as "Таблица",
  COUNT(*) as "Записей"
FROM public.trainer_territories_log;

-- 7. Проверяем структуру
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable"
FROM information_schema.columns 
WHERE table_name = 'trainer_territories_log' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;
