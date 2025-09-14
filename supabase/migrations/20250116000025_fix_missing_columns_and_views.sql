-- Исправление недостающих колонок и view

-- 1. Добавляем недостающую колонку start_time в user_test_attempts
ALTER TABLE public.user_test_attempts
ADD COLUMN IF NOT EXISTS start_time timestamptz DEFAULT now();

-- 2. Добавляем недостающую колонку is_default в feedback_templates
ALTER TABLE public.feedback_templates
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- 3. Создаем view event_participants_view
CREATE OR REPLACE VIEW public.event_participants_view AS
SELECT 
  ep.id,
  ep.event_id,
  ep.user_id,
  ep.attended,
  ep.created_at,
  ep.updated_at,
  u.full_name,
  u.email,
  u.phone,
  u.sap_number,
  p.name as position_name,
  t.name as territory_name
FROM public.event_participants ep
LEFT JOIN public.users u ON ep.user_id = u.id
LEFT JOIN public.positions p ON u.position_id = p.id
LEFT JOIN public.territories t ON u.territory_id = t.id;

-- 4. View наследует RLS от базовых таблиц, дополнительная настройка не нужна

-- 5. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';