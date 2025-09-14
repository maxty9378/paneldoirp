-- Создание таблицы trainer_territories
-- Выполните в Supabase SQL Editor

-- 1. Создаём таблицу trainer_territories
CREATE TABLE IF NOT EXISTS public.trainer_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Уникальное ограничение: один тренер может быть назначен на одну территорию только один раз
  UNIQUE(trainer_id, territory_id)
);

-- 2. Создаём индексы для производительности
CREATE INDEX IF NOT EXISTS idx_trainer_territories_trainer_id 
  ON public.trainer_territories (trainer_id);

CREATE INDEX IF NOT EXISTS idx_trainer_territories_territory_id 
  ON public.trainer_territories (territory_id);

CREATE INDEX IF NOT EXISTS idx_trainer_territories_is_active 
  ON public.trainer_territories (is_active);

-- 3. Триггер для updated_at
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

-- 4. Включаем RLS
ALTER TABLE public.trainer_territories ENABLE ROW LEVEL SECURITY;

-- 5. Создаём RLS политики
-- Читать всем аутентифицированным
DROP POLICY IF EXISTS "trainer_territories: read" ON public.trainer_territories;
CREATE POLICY "trainer_territories: read" ON public.trainer_territories
  FOR SELECT TO authenticated
  USING (true);

-- Писать только администраторам, модераторам и тренерам
DROP POLICY IF EXISTS "trainer_territories: write" ON public.trainer_territories;
CREATE POLICY "trainer_territories: write" ON public.trainer_territories
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
  'trainer_territories' as "Таблица",
  COUNT(*) as "Записей"
FROM public.trainer_territories;

-- 7. Проверяем структуру
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable"
FROM information_schema.columns 
WHERE table_name = 'trainer_territories' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;
