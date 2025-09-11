-- Исправление политик для tp_evaluations
-- Добавляем политики для администраторов и модераторов

-- Удаляем старые политики
DROP POLICY IF EXISTS "Trainers can manage evaluations for their events" ON tp_evaluations;
DROP POLICY IF EXISTS "Admins can view all evaluations" ON tp_evaluations;
DROP POLICY IF EXISTS "Participants can view their own evaluations" ON tp_evaluations;

-- Создаем новые политики

-- Администраторы и модераторы могут управлять всеми оценками
CREATE POLICY "Admins can manage all evaluations" ON tp_evaluations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('administrator', 'moderator')
    )
  );

-- Тренеры могут управлять оценками для своих мероприятий
CREATE POLICY "Trainers can manage evaluations for their events" ON tp_evaluations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = tp_evaluations.event_id
      AND e.creator_id = auth.uid()
    )
  );

-- Эксперты могут управлять оценками для мероприятий, где они участвуют
CREATE POLICY "Experts can manage evaluations for their events" ON tp_evaluations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'expert'
    )
  );

-- Участники могут видеть только свои оценки
CREATE POLICY "Participants can view their own evaluations" ON tp_evaluations
  FOR SELECT USING (participant_id = auth.uid());
