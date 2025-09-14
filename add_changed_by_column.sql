-- Добавление колонки changed_by в trainer_territories_log
-- Выполните в Supabase SQL Editor

-- 1. Добавляем колонку changed_by, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_territories_log' 
        AND column_name = 'changed_by' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.trainer_territories_log ADD COLUMN changed_by uuid;
        RAISE NOTICE 'Колонка changed_by добавлена в trainer_territories_log';
    ELSE
        RAISE NOTICE 'Колонка changed_by уже существует в trainer_territories_log';
    END IF;
END $$;

-- 2. Добавляем внешний ключ для changed_by, если его нет
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'trainer_territories_log_changed_by_fkey'
        ) THEN
            ALTER TABLE public.trainer_territories_log 
            ADD CONSTRAINT trainer_territories_log_changed_by_fkey 
            FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;
            RAISE NOTICE 'Внешний ключ changed_by добавлен';
        ELSE
            RAISE NOTICE 'Внешний ключ changed_by уже существует';
        END IF;
    END IF;
END $$;

-- 3. Проверяем структуру таблицы
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable",
  column_default as "По умолчанию"
FROM information_schema.columns 
WHERE table_name = 'trainer_territories_log' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;

-- 4. Проверяем внешние ключи
SELECT 
  tc.constraint_name as "Ограничение",
  kcu.column_name as "Колонка",
  ccu.table_name as "Ссылается на таблицу",
  ccu.column_name as "Ссылается на колонку"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'trainer_territories_log' 
  AND tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY';
