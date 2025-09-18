-- Исправление RLS политик для разрешения удаления оценок администраторами

-- Политика для удаления оценок кейсов администраторами
CREATE POLICY "Administrators can delete case evaluations" ON case_evaluations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);

-- Политика для удаления оценок диагностической игры администраторами
CREATE POLICY "Administrators can delete diagnostic game evaluations" ON diagnostic_game_evaluations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);

-- Политика для удаления оценок защиты проектов администраторами
CREATE POLICY "Administrators can delete project defense evaluations" ON project_defense_evaluations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);

-- Также добавим политики для обновления оценок администраторами
CREATE POLICY "Administrators can update case evaluations" ON case_evaluations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);

CREATE POLICY "Administrators can update diagnostic game evaluations" ON diagnostic_game_evaluations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);

CREATE POLICY "Administrators can update project defense evaluations" ON project_defense_evaluations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'administrator'
  )
);
