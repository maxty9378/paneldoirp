/*
  # Исправление структуры базы данных и создание администратора

  1. Создание недостающих таблиц
    - territories (территории)
    - positions (должности)
    - user_activity_logs (логи активности пользователей)

  2. Добавление недостающих колонок в таблицу users
    - is_active (статус активности)
    - department (подразделение)
    - is_leaving (статус увольнения)
    - position_id (ссылка на должность)
    - territory_id (ссылка на территорию)

  3. Создание/обновление пользователя-администратора
    - Проверка существования пользователя doirp@sns.ru
    - Создание или обновление роли на administrator
*/

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
        
        RAISE NOTICE 'Создана таблица territories с тестовыми данными';
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
        ('Директор филиала', 'Управление филиалом компании'),
        ('Администратор системы', 'Администрирование портала обучения');
        
        RAISE NOTICE 'Создана таблица positions с тестовыми данными';
    END IF;
END $$;

-- Добавляем недостающие поля в таблицу users
DO $$
BEGIN
    -- Добавляем поле is_active, если оно не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;
        RAISE NOTICE 'Добавлена колонка is_active в таблицу users';
    END IF;
    
    -- Добавляем поле department, если оно не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department') THEN
        ALTER TABLE users ADD COLUMN department text DEFAULT 'management_company';
        RAISE NOTICE 'Добавлена колонка department в таблицу users';
    END IF;
    
    -- Добавляем поле is_leaving, если оно не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_leaving') THEN
        ALTER TABLE users ADD COLUMN is_leaving boolean DEFAULT false;
        RAISE NOTICE 'Добавлена колонка is_leaving в таблицу users';
    END IF;
    
    -- Добавляем поле position_id, если оно не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'position_id') THEN
        ALTER TABLE users ADD COLUMN position_id uuid;
        -- Добавляем внешний ключ только если таблица positions существует
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'positions') THEN
            ALTER TABLE users ADD CONSTRAINT users_position_id_fkey FOREIGN KEY (position_id) REFERENCES positions(id);
        END IF;
        RAISE NOTICE 'Добавлена колонка position_id в таблицу users';
    END IF;
    
    -- Добавляем поле territory_id, если оно не существует
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'territory_id') THEN
        ALTER TABLE users ADD COLUMN territory_id uuid;
        -- Добавляем внешний ключ только если таблица territories существует
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'territories') THEN
            ALTER TABLE users ADD CONSTRAINT users_territory_id_fkey FOREIGN KEY (territory_id) REFERENCES territories(id);
        END IF;
        RAISE NOTICE 'Добавлена колонка territory_id в таблицу users';
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
        
        RAISE NOTICE 'Создана таблица user_activity_logs';
    END IF;
END $$;

-- Теперь работаем с пользователем-администратором (после создания всех колонок)
DO $$
DECLARE
    admin_auth_id uuid;
    admin_exists boolean;
    admin_position_id uuid;
BEGIN
    -- Пытаемся получить ID администратора из auth.users
    SELECT id INTO admin_auth_id 
    FROM auth.users 
    WHERE email = 'doirp@sns.ru' 
    LIMIT 1;
    
    -- Получаем ID должности администратора
    SELECT id INTO admin_position_id 
    FROM positions 
    WHERE name = 'Администратор системы' 
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
                is_active,
                department,
                position_id
            ) VALUES (
                admin_auth_id,
                'doirp@sns.ru',
                'Администратор портала',
                'administrator',
                'management_company',
                'active',
                0,
                true,
                'management_company',
                admin_position_id
            );
            RAISE NOTICE 'Создан новый пользователь-администратор с ID: %', admin_auth_id;
        ELSE
            -- Если администратор существует, убеждаемся, что роль установлена как administrator
            UPDATE users 
            SET 
                role = 'administrator',
                is_active = true,
                department = 'management_company',
                position_id = COALESCE(position_id, admin_position_id)
            WHERE id = admin_auth_id;
            
            RAISE NOTICE 'Обновлена роль существующего пользователя на administrator с ID: %', admin_auth_id;
        END IF;
    ELSE
        RAISE NOTICE 'Пользователь с email doirp@sns.ru не найден в auth.users. Создайте пользователя через интерфейс.';
    END IF;
END $$;

-- Обновляем существующих пользователей, устанавливая значения по умолчанию для новых полей
UPDATE users 
SET 
    is_active = COALESCE(is_active, true),
    department = COALESCE(department, 'management_company'),
    is_leaving = COALESCE(is_leaving, false)
WHERE is_active IS NULL OR department IS NULL OR is_leaving IS NULL;