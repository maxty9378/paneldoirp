-- Прямой тест вставки в trainer_territories
-- Выполните в Supabase SQL Editor

-- 1. Получаем ID пользователя и территории
WITH user_data AS (
  SELECT id as user_id FROM public.users LIMIT 1
),
territory_data AS (
  SELECT id as territory_id FROM public.territories LIMIT 1
)
-- 2. Пробуем вставить тестовую запись
INSERT INTO public.trainer_territories (trainer_id, territory_id, is_active)
SELECT user_id, territory_id, true
FROM user_data, territory_data
ON CONFLICT (trainer_id, territory_id) DO NOTHING;

-- 3. Проверяем результат
SELECT 
  COUNT(*) as "Записей в trainer_territories",
  COUNT(*) FILTER (WHERE is_active = true) as "Активных записей"
FROM public.trainer_territories;

-- 4. Показываем созданные записи
SELECT 
  tt.id,
  u.full_name as "Тренер",
  t.name as "Территория",
  tt.is_active,
  tt.assigned_at
FROM public.trainer_territories tt
LEFT JOIN public.users u ON tt.trainer_id = u.id
LEFT JOIN public.territories t ON tt.territory_id = t.id
ORDER BY tt.assigned_at DESC;
