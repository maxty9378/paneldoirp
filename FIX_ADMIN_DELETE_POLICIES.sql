-- =====================================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК ДЛЯ УДАЛЕНИЯ ОЦЕНОК АДМИНИСТРАТОРАМИ
-- =====================================================
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

-- Создаем политики для удаления оценок кейсов (если не существуют)
CREATE POLICY IF NOT EXISTS "Users can delete their own case evaluations" ON case_evaluations
FOR DELETE
TO authenticated
USING (evaluator_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Administrators can delete case evaluations" ON case_evaluations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);

-- Создаем политики для удаления оценок диагностической игры (если не существуют)
CREATE POLICY IF NOT EXISTS "Users can delete their own diagnostic game evaluations" ON diagnostic_game_evaluations
FOR DELETE
TO authenticated
USING (evaluator_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Administrators can delete diagnostic game evaluations" ON diagnostic_game_evaluations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);

-- Создаем политики для удаления оценок защиты проектов (если не существуют)
CREATE POLICY IF NOT EXISTS "Users can delete their own project defense evaluations" ON project_defense_evaluations
FOR DELETE
TO authenticated
USING (evaluator_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Administrators can delete project defense evaluations" ON project_defense_evaluations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);

-- Также создаем политики для обновления оценок (если не существуют)
CREATE POLICY IF NOT EXISTS "Users can update their own case evaluations" ON case_evaluations
FOR UPDATE
TO authenticated
USING (evaluator_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Administrators can update case evaluations" ON case_evaluations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);

CREATE POLICY IF NOT EXISTS "Users can update their own diagnostic game evaluations" ON diagnostic_game_evaluations
FOR UPDATE
TO authenticated
USING (evaluator_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Administrators can update diagnostic game evaluations" ON diagnostic_game_evaluations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);

CREATE POLICY IF NOT EXISTS "Users can update their own project defense evaluations" ON project_defense_evaluations
FOR UPDATE
TO authenticated
USING (evaluator_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Administrators can update project defense evaluations" ON project_defense_evaluations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);
