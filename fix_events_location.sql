-- Исправление отсутствующей колонки location в таблице events

-- Проверяем существование колонки location
DO $$
BEGIN
    -- Добавляем колонку location, если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'location'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN location text;
        
        RAISE NOTICE 'Колонка location добавлена в таблицу events';
    ELSE
        RAISE NOTICE 'Колонка location уже существует в таблице events';
    END IF;
END $$;

-- Проверяем другие возможные недостающие колонки
DO $$
BEGIN
    -- Добавляем колонку meeting_link, если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'meeting_link'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN meeting_link text;
        
        RAISE NOTICE 'Колонка meeting_link добавлена в таблицу events';
    END IF;
    
    -- Добавляем колонку points, если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'points'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN points integer DEFAULT 0;
        
        RAISE NOTICE 'Колонка points добавлена в таблицу events';
    END IF;
    
    -- Добавляем колонку max_participants, если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'max_participants'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN max_participants integer;
        
        RAISE NOTICE 'Колонка max_participants добавлена в таблицу events';
    END IF;
    
    -- Добавляем колонку status, если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN status text DEFAULT 'draft';
        
        RAISE NOTICE 'Колонка status добавлена в таблицу events';
    END IF;
    
    -- Добавляем колонку creator_id, если её нет
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'creator_id'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN creator_id uuid REFERENCES public.users(id);
        
        RAISE NOTICE 'Колонка creator_id добавлена в таблицу events';
    END IF;
END $$;

-- Показываем текущую структуру таблицы events
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'events' 
ORDER BY ordinal_position;
