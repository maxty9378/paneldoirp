-- Добавление базовых должностей для системы SNS
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
ORDER BY name;

-- 2. Добавляем базовые должности для фармацевтической компании
INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Генеральный директор', 'Руководство компанией', 10, 'Executive', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Генеральный директор');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Коммерческий директор', 'Руководство коммерческой деятельностью', 9, 'Executive', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Коммерческий директор');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Директор по продажам', 'Руководство отделом продаж', 8, 'Sales', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Директор по продажам');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Региональный директор', 'Руководство регионом', 7, 'Sales', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Региональный директор');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Директор филиала', 'Руководство филиалом', 6, 'Sales', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Директор филиала');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Начальник отдела продаж', 'Руководство отделом продаж', 5, 'Sales', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Начальник отдела продаж');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Супервайзер', 'Надзор за торговыми представителями', 4, 'Sales', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Супервайзер');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Старший торговый представитель', 'Опытный торговый представитель', 3, 'Sales', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Старший торговый представитель');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Торговый представитель', 'Работа с клиентами и продажи', 2, 'Sales', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Торговый представитель');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Младший торговый представитель', 'Начинающий торговый представитель', 1, 'Sales', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Младший торговый представитель');

-- Должности для обучения
INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Директор по обучению', 'Руководство отделом обучения', 8, 'Training', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Директор по обучению');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Начальник отдела обучения', 'Руководство отделом обучения', 6, 'Training', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Начальник отдела обучения');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Старший тренер', 'Ведущий тренер', 5, 'Training', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Старший тренер');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Тренер', 'Проведение обучения', 4, 'Training', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Тренер');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Младший тренер', 'Помощник тренера', 3, 'Training', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Младший тренер');

-- Административные должности
INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Администратор системы', 'Администрирование портала', 7, 'IT', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Администратор системы');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Менеджер', 'Управление командой', 5, 'Management', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Менеджер');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Специалист', 'Квалифицированный специалист', 2, 'General', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Специалист');

INSERT INTO positions (name, description, level, department, is_active, created_at, updated_at)
SELECT 'Сотрудник', 'Базовая должность', 1, 'General', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM positions WHERE name = 'Сотрудник');

-- 3. Проверяем результат
SELECT 
    'Updated Positions' as check_type,
    id,
    name,
    description,
    level,
    department,
    is_active
FROM positions 
ORDER BY department, level DESC, name;

-- 4. Статистика по отделам
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
