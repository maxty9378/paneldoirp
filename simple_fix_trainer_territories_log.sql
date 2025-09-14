-- Простое исправление таблицы trainer_territories_log
-- Выполните в Supabase SQL Editor

-- 1. Удаляем таблицу, если она существует (осторожно!)
DROP TABLE IF EXISTS public.trainer_territories_log CASCADE;

-- 2. Создаём таблицу заново с правильной структурой
CREATE TABLE public.trainer_territories_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_territory_id uuid,
  trainer_id uuid NOT NULL,
  territory_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('assigned', 'unassigned', 'activated', 'deactivated', 'deleted')),
  performed_by uuid NOT NULL,
  performed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 3. Добавляем внешние ключи (только если таблицы существуют)
DO $$ 
BEGIN
    -- FK на users для trainer_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        ALTER TABLE public.trainer_territories_log 
        ADD CONSTRAINT trainer_territories_log_trainer_id_fkey 
        FOREIGN KEY (trainer_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- FK на territories для territory_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'territories' AND table_schema = 'public') THEN
        ALTER TABLE public.trainer_territories_log 
        ADD CONSTRAINT trainer_territories_log_territory_id_fkey 
        FOREIGN KEY (territory_id) REFERENCES public.territories(id) ON DELETE CASCADE;
    END IF;
    
    -- FK на users для performed_by
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        ALTER TABLE public.trainer_territories_log 
        ADD CONSTRAINT trainer_territories_log_performed_by_fkey 
        FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    -- FK на trainer_territories для trainer_territory_id (если таблица существует)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainer_territories' AND table_schema = 'public') THEN
        ALTER TABLE public.trainer_territories_log 
        ADD CONSTRAINT trainer_territories_log_trainer_territory_id_fkey 
        FOREIGN KEY (trainer_territory_id) REFERENCES public.trainer_territories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Создаём индексы для производительности
CREATE INDEX idx_trainer_territories_log_trainer_id 
  ON public.trainer_territories_log (trainer_id);

CREATE INDEX idx_trainer_territories_log_territory_id 
  ON public.trainer_territories_log (territory_id);

CREATE INDEX idx_trainer_territories_log_performed_at 
  ON public.trainer_territories_log (performed_at DESC);

-- 5. Включаем RLS
ALTER TABLE public.trainer_territories_log ENABLE ROW LEVEL SECURITY;

-- 6. Создаём RLS политики
-- Читать всем аутентифицированным
CREATE POLICY "trainer_territories_log: read" ON public.trainer_territories_log
  FOR SELECT TO authenticated
  USING (true);

-- Писать только администраторам, модераторам и тренерам
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

-- 7. Проверяем результат
SELECT 
  'trainer_territories_log' as "Таблица",
  COUNT(*) as "Записей"
FROM public.trainer_territories_log;

-- 8. Показываем структуру таблицы
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable",
  column_default as "По умолчанию"
FROM information_schema.columns 
WHERE table_name = 'trainer_territories_log' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;
