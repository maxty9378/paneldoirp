-- Тест вставки в таблицу trainer_territories
-- Выполните в Supabase SQL Editor

-- 1. Проверяем RLS политики
SELECT 
  policyname as "Политика",
  cmd as "Команда",
  roles as "Роли",
  qual as "Условие"
FROM pg_policies 
WHERE tablename = 'trainer_territories' AND schemaname = 'public';

-- 2. Проверяем, включен ли RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS включен"
FROM pg_tables 
WHERE tablename = 'trainer_territories' AND schemaname = 'public';

-- 3. Проверяем существование пользователей и территорий
SELECT COUNT(*) as "Пользователей" FROM public.users;
SELECT COUNT(*) as "Территорий" FROM public.territories;

-- 4. Получаем ID пользователя и территории для теста
SELECT id, full_name, email FROM public.users LIMIT 1;
SELECT id, name, region FROM public.territories LIMIT 1;

-- 5. Пробуем вставить тестовую запись (закомментировано для безопасности)
-- INSERT INTO public.trainer_territories (trainer_id, territory_id, is_active) 
-- VALUES (
--   (SELECT id FROM public.users LIMIT 1),
--   (SELECT id FROM public.territories LIMIT 1),
--   true
-- );

-- 6. Проверяем права доступа
SELECT 
  has_table_privilege('public.trainer_territories', 'SELECT') as "Может читать",
  has_table_privilege('public.trainer_territories', 'INSERT') as "Может вставлять",
  has_table_privilege('public.trainer_territories', 'UPDATE') as "Может обновлять",
  has_table_privilege('public.trainer_territories', 'DELETE') as "Может удалять";
