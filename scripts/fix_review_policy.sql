-- Удаляем старую политику и создаем новую для обновления тестов при проверке
DROP POLICY IF EXISTS "Users can update their tests" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can complete their tests" ON user_test_attempts;
DROP POLICY IF EXISTS "Users can update their own test attempts" ON user_test_attempts;

-- Создаем новую политику для обновления тестов
CREATE POLICY "Users and trainers can update test attempts"
ON user_test_attempts FOR UPDATE
TO authenticated
USING (
  -- Пользователи могут обновлять свои собственные попытки
  user_id = auth.uid()
  OR
  -- Тренеры и администраторы могут обновлять попытки для проверки
  (
    status = 'pending_review' AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('administrator', 'trainer')
    )
  )
);
