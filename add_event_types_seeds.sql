-- =====================================================
-- ДОБАВЛЕНИЕ СИДОВ ТИПОВ МЕРОПРИЯТИЙ
-- =====================================================

-- 1. Добавляем недостающие колонки в event_types
ALTER TABLE event_types 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_location BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_entry_test BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_final_test BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_feedback_form BOOLEAN DEFAULT false;

-- 2. Обновляем существующие записи
UPDATE event_types 
SET 
  is_online = CASE 
    WHEN name = 'in_person_training' THEN false
    WHEN name = 'online_training' THEN true
    ELSE false
  END,
  requires_location = CASE 
    WHEN name = 'in_person_training' THEN true
    WHEN name = 'online_training' THEN false
    ELSE true
  END,
  has_entry_test = true,
  has_final_test = true,
  has_feedback_form = true
WHERE is_online IS NULL;

-- 3. Вставляем сиды типов мероприятий
INSERT INTO public.event_types (name, name_ru, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form) VALUES
('welcome_course','Welcome Course', true,  false, true,  true,  true),
('online_training','Онлайн-тренинг', true,  false, true,  true,  true),
('online_marathon','Онлайн-марафон', true,  false, true,  true,  true),
('offline_training','Очный тренинг', false, true,  true,  true,  true),
('work_session','Рабочая сессия',  false, true,  false, false, true),
('practicum','Практикум',          false, true,  true,  true,  true),
('case_marathon','Кейс-марафон',   true,  false, true,  true,  true),
('exam','Экзамен',                 false, true,  false, true,  false),
('demo_lab','Демо-лаборатория',    false, true,  false, false, true),
('complex_program','Комплексная программа', false, true, true, true, true),
('conference','Конференция',       false, true,  false, false, true),
('business_game','Деловая игра',   false, true,  false, false, true),
('active_seminar','Активный семинар', false, true, false, false, true),
('team_tracking','Командный трекинг', false, true, false, false, true)
ON CONFLICT (name) DO NOTHING;

-- 4. Добавляем комментарии к новым колонкам
COMMENT ON COLUMN event_types.is_online IS 'Является ли мероприятие онлайн';
COMMENT ON COLUMN event_types.requires_location IS 'Требуется ли указание места проведения';
COMMENT ON COLUMN event_types.has_entry_test IS 'Есть ли вступительный тест';
COMMENT ON COLUMN event_types.has_final_test IS 'Есть ли итоговый тест';
COMMENT ON COLUMN event_types.has_feedback_form IS 'Есть ли форма обратной связи';

-- 5. Проверяем результат
SELECT 
  name, 
  name_ru, 
  is_online, 
  requires_location, 
  has_entry_test, 
  has_final_test, 
  has_feedback_form 
FROM event_types 
ORDER BY name;
