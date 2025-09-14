-- ===== ИСПРАВЛЕНИЕ СОЗДАНИЯ МЕРОПРИЯТИЙ =====
-- Выполните в Supabase SQL Editor

-- ===== 1) Поднимем справочник типов мероприятий (если пусто) =====
-- (если у тебя свой набор — потом дополни)
INSERT INTO public.event_types (name, name_ru, is_online, requires_location, has_entry_test, has_final_test, has_feedback_form)
VALUES
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

-- Разрешим чтение типов всем авторизованным (если RLS включен)
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_types: read" ON public.event_types;
CREATE POLICY "event_types: read" ON public.event_types
  FOR SELECT TO authenticated
  USING (true);

-- ===== 2) user_test_attempts: привести схему под запросы фронта =====
-- Таблица должна иметь event_id и status, а status должен понимать значения completed/pending_review.

-- Если таблицы нет, создадим базово
CREATE TABLE IF NOT EXISTS public.user_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',   -- текст, без жесткого enum
  start_time timestamptz DEFAULT now(),
  score integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Если таблица уже была — добавим недостающие колонки
ALTER TABLE public.user_test_attempts
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text;

-- Если status оказался НЕ text (например enum) — преобразуем в text,
-- чтобы фронт мог фильтровать и по completed, и по pending_review.
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='user_test_attempts' AND column_name='status';

  IF col_type = 'USER-DEFINED' THEN
    -- enum -> text
    ALTER TABLE public.user_test_attempts
      ALTER COLUMN status TYPE text USING status::text;
  END IF;
END $$;

-- На всякий: дефолт и not null
ALTER TABLE public.user_test_attempts
  ALTER COLUMN status SET DEFAULT 'in_progress';

-- Индексы для быстрого фильтра
CREATE INDEX IF NOT EXISTS idx_uta_event_status ON public.user_test_attempts(event_id, status);
CREATE INDEX IF NOT EXISTS idx_uta_user ON public.user_test_attempts(user_id);

-- Триггер обновления updated_at (если у тебя его нет)
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_user_test_attempts_touch ON public.user_test_attempts;
CREATE TRIGGER tg_user_test_attempts_touch
  BEFORE UPDATE ON public.user_test_attempts
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- RLS для попыток (чтение своих, создателя события, админ/модер)
ALTER TABLE public.user_test_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Attempts read own/creator/admin" ON public.user_test_attempts;
CREATE POLICY "Attempts read own/creator/admin" ON public.user_test_attempts
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = user_test_attempts.event_id AND e.creator_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('administrator','moderator')
    )
  );

-- ===== 3) sanity-проверки, что фронт перестанет падать (опционально) =====
-- a) селект типов должен вернуть строки
SELECT id, name, name_ru, is_online FROM public.event_types LIMIT 5;

-- b) селект попыток по событию не должен отдавать 400, даже если пусто
SELECT id, user_id FROM public.user_test_attempts
  WHERE event_id = '0ec2db39-99ae-4538-a75c-56c686e5223c' AND status='completed';

SELECT id FROM public.user_test_attempts
  WHERE event_id = '0ec2db39-99ae-4538-a75c-56c686e5223c' AND status='pending_review';
