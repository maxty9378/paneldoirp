-- Поиск тренера Кадочкин Максим и его филиала

-- 1. Найдем тренера по имени
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.phone,
  u.branch_id,
  u.role,
  u.subdivision,
  u.branch_subrole,
  u.status,
  b.id as branch_id_from_branches,
  b.name as branch_name,
  b.code as branch_code,
  b.address as branch_address
FROM users u
LEFT JOIN branches b ON u.branch_id = b.id
WHERE u.full_name ILIKE '%Кадочкин%Максим%' 
   OR u.full_name ILIKE '%Кадочкин%'
   OR u.full_name ILIKE '%Максим%Кадочкин%'
   OR u.email ILIKE '%кадочкин%'
   OR u.email ILIKE '%kadockin%'
ORDER BY u.full_name;

-- 2. Если не найдем, поищем всех тренеров
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.branch_id,
  b.name as branch_name
FROM users u
LEFT JOIN branches b ON u.branch_id = b.id
WHERE u.role = 'trainer'
ORDER BY u.full_name;

-- 3. Посмотрим все филиалы
SELECT 
  id,
  name,
  code,
  address
FROM branches
ORDER BY name;
