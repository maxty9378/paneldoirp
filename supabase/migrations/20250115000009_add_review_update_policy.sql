-- Добавляем политику для обновления тестов тренерами и администраторами при проверке
CREATE POLICY "Тренеры и администраторы могут обновлять тесты при проверке"
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
