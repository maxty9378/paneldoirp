-- Исправление таблицы territories - добавление колонки region
-- Выполните в Supabase SQL Editor

-- 1. Проверяем текущую структуру
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'territories' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;

-- 2. Добавляем колонку region, если её нет
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
    ELSE
        RAISE NOTICE 'Колонка region уже существует в таблице territories';
    END IF;
END $$;

-- 3. Добавляем колонку is_active, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'territories' 
        AND column_name = 'is_active' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.territories ADD COLUMN is_active boolean DEFAULT true;
        RAISE NOTICE 'Колонка is_active добавлена в таблицу territories';
    ELSE
        RAISE NOTICE 'Колонка is_active уже существует в таблице territories';
    END IF;
END $$;

-- 4. Обновляем существующие записи
UPDATE public.territories 
SET region = 'Не указан'
WHERE region IS NULL OR region = '';

-- 5. Устанавливаем NOT NULL для region
ALTER TABLE public.territories ALTER COLUMN region SET NOT NULL;

-- 6. Создаём уникальный индекс на name
CREATE UNIQUE INDEX IF NOT EXISTS idx_territories_name_unique ON public.territories (name);

-- 7. Добавляем базовые территории
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

-- 8. Проверяем результат
SELECT 
  name as "Территория",
  region as "Регион", 
  is_active as "Активна",
  created_at as "Создана"
FROM public.territories 
ORDER BY name;
