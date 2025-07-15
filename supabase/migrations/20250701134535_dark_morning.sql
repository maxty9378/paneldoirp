-- Проверяем наличие пользователя-администратора в базе данных
DO $$
DECLARE
    admin_auth_id uuid;
    admin_exists boolean;
BEGIN
    -- Пытаемся получить ID администратора из auth.users
    SELECT id INTO admin_auth_id 
    FROM auth.users 
    WHERE email = 'doirp@sns.ru' 
    LIMIT 1;
    
    IF admin_auth_id IS NOT NULL THEN
        -- Проверяем, существует ли пользователь в таблице users
        SELECT EXISTS(
            SELECT 1 FROM users WHERE id = admin_auth_id
        ) INTO admin_exists;
        
        -- Если администратор не существует в таблице users, создаем его
        IF NOT admin_exists THEN
            INSERT INTO users (
                id, 
                email, 
                full_name, 
                role, 
                subdivision, 
                status, 
                work_experience_days,
                is_active
            ) VALUES (
                admin_auth_id,
                'doirp@sns.ru',
                'Администратор портала',
                'administrator',
                'management_company',
                'active',
                0,
                true
            );
            RAISE NOTICE 'Создан новый пользователь-администратор';
        ELSE
            -- Если администратор существует, убеждаемся, что роль установлена как administrator
            UPDATE users 
            SET 
                role = 'administrator',
                is_active = true
            WHERE id = admin_auth_id AND (role != 'administrator' OR is_active IS NOT TRUE);
            RAISE NOTICE 'Обновлена роль существующего пользователя на administrator';
        END IF;
    ELSE
        RAISE NOTICE 'Пользователь с email doirp@sns.ru не найден в auth.users';
    END IF;
END $$;

-- Создаем таблицы, если они не существуют
DO $$
BEGIN
    -- Создаем таблицу territories, если она не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'territories') THEN
        CREATE TABLE territories (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text NOT NULL,
            region text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
        
        -- Добавляем несколько территорий
        INSERT INTO territories (name, region) VALUES
        ('Москва', 'Центральный'),
        ('Санкт-Петербург', 'Северо-Западный'),
        ('Екатеринбург', 'Уральский'),
        ('Новосибирск', 'Сибирский');
    END IF;
    
    -- Создаем таблицу positions, если она не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'positions') THEN
        CREATE TABLE positions (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name text NOT NULL,
            description text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
        
        -- Добавляем несколько должностей
        INSERT INTO positions (name, description) VALUES
        ('Торговый представитель', 'Работа с клиентами и продажи'),
        ('Супервайзер', 'Управление командой торговых представителей'),
        ('Тренер', 'Обучение и развитие сотрудников'),
        ('Директор филиала', 'Управление филиалом компании');
    END IF;
END $$;

-- Добавляем поля is_active и department в таблицу users, если они не существуют
DO $$
BEGIN
    -- Добавляем поле is_active, если оно не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    
    -- Добавляем поле department, если оно не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department') THEN
        ALTER TABLE users ADD COLUMN department text DEFAULT 'managing_company';
    END IF;
    
    -- Добавляем поле is_leaving, если оно не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_leaving') THEN
        ALTER TABLE users ADD COLUMN is_leaving boolean DEFAULT false;
    END IF;
    
    -- Добавляем поле position_id, если оно не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'position_id') THEN
        ALTER TABLE users ADD COLUMN position_id uuid REFERENCES positions(id);
    END IF;
    
    -- Добавляем поле territory_id, если оно не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'territory_id') THEN
        ALTER TABLE users ADD COLUMN territory_id uuid REFERENCES territories(id);
    END IF;
END $$;

-- Создаем таблицу user_activity_logs, если она не существует
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_logs') THEN
        CREATE TABLE user_activity_logs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES users(id),
            action text NOT NULL,
            resource_type text,
            resource_id uuid,
            old_values jsonb,
            new_values jsonb,
            created_at timestamptz DEFAULT now()
        );
    END IF;
END $$;