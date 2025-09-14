-- Исправление ограничения NOT NULL для performed_by
-- Выполните в Supabase SQL Editor

-- 1. Удаляем ограничение NOT NULL для performed_by
ALTER TABLE public.trainer_territories_log 
ALTER COLUMN performed_by DROP NOT NULL;

-- 2. Устанавливаем значение по умолчанию
ALTER TABLE public.trainer_territories_log 
ALTER COLUMN performed_by SET DEFAULT auth.uid();

-- 3. Обновляем существующие записи с NULL в performed_by
UPDATE public.trainer_territories_log 
SET performed_by = trainer_id 
WHERE performed_by IS NULL;

-- 4. Проверяем структуру таблицы
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable",
  column_default as "По умолчанию"
FROM information_schema.columns 
WHERE table_name = 'trainer_territories_log' 
  AND table_schema = 'public' 
  AND column_name = 'performed_by';

-- 5. Проверяем, есть ли записи с NULL в performed_by
SELECT 
  COUNT(*) as "Всего записей",
  COUNT(performed_by) as "С performed_by",
  COUNT(*) - COUNT(performed_by) as "Без performed_by"
FROM public.trainer_territories_log;
