-- Исправление RLS политик для таблицы territories
-- Выполните в Supabase SQL Editor

-- 1. Проверяем текущие RLS политики
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'territories' AND schemaname = 'public';

-- 2. Удаляем все существующие политики
DROP POLICY IF EXISTS "territories: read" ON public.territories;
DROP POLICY IF EXISTS "territories: write" ON public.territories;
DROP POLICY IF EXISTS "territories: insert" ON public.territories;
DROP POLICY IF EXISTS "territories: update" ON public.territories;
DROP POLICY IF EXISTS "territories: delete" ON public.territories;

-- 3. Временно отключаем RLS для исправления
ALTER TABLE public.territories DISABLE ROW LEVEL SECURITY;

-- 4. Добавляем колонку region, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' 
        AND column_name = 'region' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.territories ADD COLUMN region text;
        RAISE NOTICE 'Колонка region добавлена в таблицу territories';
    END IF;
    
    -- Добавляем is_active, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' 
        AND column_name = 'is_active' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.territories ADD COLUMN is_active boolean DEFAULT true;
        RAISE NOTICE 'Колонка is_active добавлена в таблицу territories';
    END IF;
END $$;

-- 5. Обновляем существующие записи
UPDATE public.territories 
SET region = 'Не указан'
WHERE region IS NULL OR region = '';

-- 6. Устанавливаем NOT NULL для region
ALTER TABLE public.territories ALTER COLUMN region SET NOT NULL;

-- 7. Создаём уникальный индекс на name
CREATE UNIQUE INDEX IF NOT EXISTS idx_territories_name_unique ON public.territories (name);

-- 8. Добавляем базовые территории
INSERT INTO public.territories (name, region, is_active) VALUES
  ('Центральный офис', 'Москва', true),
  ('Северо-Западный регион', 'Санкт-Петербург', true),
  ('Южный регион', 'Краснодар', true),
  ('Уральский регион', 'Екатеринбург', true),
  ('Сибирский регион', 'Новосибирск', true),
  ('Дальневосточный регион', 'Владивосток', true)
ON CONFLICT (name) DO UPDATE SET
  region = EXCLUDED.region,
  is_active = true;

-- 9. Включаем RLS обратно
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

-- 10. Создаём простые RLS политики
-- Читать всем аутентифицированным
CREATE POLICY "territories: read" ON public.territories
  FOR SELECT TO authenticated
  USING (true);

-- Писать всем аутентифицированным (временно для тестирования)
CREATE POLICY "territories: write" ON public.territories
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 11. Проверяем результат
SELECT 
  name as "Территория",
  region as "Регион", 
  is_active as "Активна",
  created_at as "Создана"
FROM public.territories 
ORDER BY name;

-- 12. Проверяем RLS политики
SELECT 
  policyname as "Политика",
  cmd as "Команда",
  roles as "Роли"
FROM pg_policies 
WHERE tablename = 'territories' AND schemaname = 'public';
