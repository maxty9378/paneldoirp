-- Исправление структуры таблицы user_test_attempts
-- Выполните в Supabase SQL Editor

-- 1. Проверяем текущую структуру таблицы
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable",
  column_default as "По умолчанию"
FROM information_schema.columns 
WHERE table_name = 'user_test_attempts' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;

-- 2. Добавляем недостающие колонки
DO $$ 
BEGIN
    -- Добавляем event_id, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'event_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN event_id uuid;
        RAISE NOTICE 'Колонка event_id добавлена';
    END IF;
    
    -- Добавляем test_id, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'test_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN test_id uuid;
        RAISE NOTICE 'Колонка test_id добавлена';
    END IF;
    
    -- Добавляем status, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'status' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN status text DEFAULT 'pending';
        RAISE NOTICE 'Колонка status добавлена';
    END IF;
    
    -- Добавляем score, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'score' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN score integer DEFAULT 0;
        RAISE NOTICE 'Колонка score добавлена';
    END IF;
    
    -- Добавляем max_score, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'max_score' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN max_score integer DEFAULT 0;
        RAISE NOTICE 'Колонка max_score добавлена';
    END IF;
    
    -- Добавляем started_at, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'started_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN started_at timestamptz;
        RAISE NOTICE 'Колонка started_at добавлена';
    END IF;
    
    -- Добавляем completed_at, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'completed_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN completed_at timestamptz;
        RAISE NOTICE 'Колонка completed_at добавлена';
    END IF;
    
    -- Добавляем reviewed_at, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'reviewed_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN reviewed_at timestamptz;
        RAISE NOTICE 'Колонка reviewed_at добавлена';
    END IF;
    
    -- Добавляем reviewed_by, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'reviewed_by' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN reviewed_by uuid;
        RAISE NOTICE 'Колонка reviewed_by добавлена';
    END IF;
    
    -- Добавляем feedback, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'feedback' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN feedback text;
        RAISE NOTICE 'Колонка feedback добавлена';
    END IF;
    
    -- Добавляем answers, если её нет
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_test_attempts' 
        AND column_name = 'answers' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.user_test_attempts ADD COLUMN answers jsonb DEFAULT '{}';
        RAISE NOTICE 'Колонка answers добавлена';
    END IF;
END $$;

-- 3. Устанавливаем NOT NULL для обязательных колонок
ALTER TABLE public.user_test_attempts ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE public.user_test_attempts ALTER COLUMN status SET NOT NULL;

-- 4. Добавляем CHECK constraint для status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_test_attempts_status_check'
    ) THEN
        ALTER TABLE public.user_test_attempts 
        ADD CONSTRAINT user_test_attempts_status_check 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'pending_review', 'reviewed', 'failed'));
    END IF;
END $$;

-- 5. Проверяем финальную структуру
SELECT 
  column_name as "Колонка",
  data_type as "Тип",
  is_nullable as "Nullable",
  column_default as "По умолчанию"
FROM information_schema.columns 
WHERE table_name = 'user_test_attempts' 
  AND table_schema = 'public' 
ORDER BY ordinal_position;
