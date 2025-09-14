-- Добавление колонки region в таблицу territories
-- Выполните в Supabase SQL Editor

-- 1. Добавляем колонку region, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' 
        AND column_name = 'region' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.territories ADD COLUMN region text;
    END IF;
END $$;

-- 2. Добавляем колонку is_active, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' 
        AND column_name = 'is_active' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.territories ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END $$;

-- 3. Обновляем существующие записи, если region пустой
UPDATE public.territories 
SET region = 'Не указан'
WHERE region IS NULL OR region = '';

-- 4. Устанавливаем NOT NULL для region
ALTER TABLE public.territories ALTER COLUMN region SET NOT NULL;

-- 5. Создаём уникальный индекс на name, если его нет
CREATE UNIQUE INDEX IF NOT EXISTS idx_territories_name_unique ON public.territories (name);

-- 6. Добавляем базовые территории с регионами, если их нет
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

-- 7. Проверяем результат
SELECT 
  name as "Территория",
  region as "Регион", 
  is_active as "Активна"
FROM public.territories 
ORDER BY name;
