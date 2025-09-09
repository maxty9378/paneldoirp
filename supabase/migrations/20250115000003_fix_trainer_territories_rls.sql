-- Исправление RLS политик для таблицы trainer_territories

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Administrators can manage trainer territories" ON trainer_territories;
DROP POLICY IF EXISTS "Trainers and moderators can view trainer territories" ON trainer_territories;

-- Создаем новые политики с правильными правами

-- Администраторы могут делать все операции
CREATE POLICY "Administrators can manage all trainer territories"
  ON trainer_territories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'administrator'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'administrator'));

-- Тренеры и модераторы могут просматривать свои назначения
CREATE POLICY "Trainers and moderators can view their assigned territories"
  ON trainer_territories FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'trainer' OR role = 'moderator'))
    AND trainer_id = auth.uid()
  );
