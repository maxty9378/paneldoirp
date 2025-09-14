-- Исправление иерархии должностей в системе SNS
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Проверяем текущие должности
SELECT 
    'Current Positions' as check_type,
    id,
    name,
    description,
    level,
    department,
    is_active
FROM positions 
ORDER BY level DESC, name;

-- 2. Обновляем уровни должностей согласно иерархии
UPDATE positions 
SET 
    level = 10,
    department = 'IT',
    updated_at = NOW()
WHERE name = 'Администратор системы';

UPDATE positions 
SET 
    level = 9,
    department = 'Management',
    updated_at = NOW()
WHERE name = 'Директор филиала';

UPDATE positions 
SET 
    level = 7,
    department = 'Management',
    updated_at = NOW()
WHERE name = 'Менеджер';

UPDATE positions 
SET 
    level = 6,
    department = 'Training',
    updated_at = NOW()
WHERE name = 'Тренер СПП';

UPDATE positions 
SET 
    level = 5,
    department = 'Operations',
    updated_at = NOW()
WHERE name = 'Супервайзер';

UPDATE positions 
SET 
    level = 3,
    department = 'Sales',
    updated_at = NOW()
WHERE name = 'Торговый представитель';

UPDATE positions 
SET 
    level = 1,
    department = 'General',
    updated_at = NOW()
WHERE name = 'Сотрудник';

-- 3. Добавляем недостающие должности
INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Генеральный директор', 'Руководство компанией', 12, 'Executive', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Генеральный директор');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Заместитель директора', 'Помощник генерального директора', 11, 'Executive', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Заместитель директора');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Начальник отдела', 'Руководство отделом', 8, 'Management', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Начальник отдела');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Старший тренер', 'Ведущий тренер с расширенными полномочиями', 6, 'Training', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Старший тренер');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Ведущий специалист', 'Старший специалист с опытом', 4, 'Operations', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Ведущий специалист');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Старший торговый представитель', 'Опытный торговый представитель', 4, 'Sales', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Старший торговый представитель');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Специалист', 'Квалифицированный специалист', 2, 'General', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Специалист');

-- 4. Проверяем результат
SELECT 
    'Updated Positions' as check_type,
    id,
    name,
    description,
    level,
    department,
    is_active
FROM positions 
ORDER BY level DESC, name;

-- 5. Статистика по отделам
SELECT 
    'Department Statistics' as check_type,
    department,
    COUNT(*) as position_count,
    MIN(level) as min_level,
    MAX(level) as max_level
FROM positions 
WHERE is_active = true
GROUP BY department
ORDER BY MAX(level) DESC;
