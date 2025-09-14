-- Проверка данных для тестирования
-- Выполните в Supabase SQL Editor

-- 1. Проверяем пользователей
SELECT 
  COUNT(*) as "Всего пользователей",
  COUNT(*) FILTER (WHERE role = 'trainer') as "Тренеров",
  COUNT(*) FILTER (WHERE role = 'administrator') as "Администраторов"
FROM public.users;

-- 2. Показываем первых 3 пользователей
SELECT 
  id,
  full_name,
  email,
  role,
  is_active
FROM public.users 
ORDER BY created_at 
LIMIT 3;

-- 3. Проверяем территории
SELECT 
  COUNT(*) as "Всего территорий",
  COUNT(*) FILTER (WHERE is_active = true) as "Активных территорий"
FROM public.territories;

-- 4. Показываем первые 3 территории
SELECT 
  id,
  name,
  region,
  is_active
FROM public.territories 
ORDER BY created_at 
LIMIT 3;

-- 5. Проверяем текущего пользователя
SELECT 
  auth.uid() as "Текущий пользователь ID",
  auth.role() as "Роль пользователя";

-- 6. Проверяем, есть ли тренеры
SELECT 
  id,
  full_name,
  email,
  role
FROM public.users 
WHERE role = 'trainer' 
  AND is_active = true
LIMIT 5;
