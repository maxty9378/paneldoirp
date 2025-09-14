-- Исправление RLS политик для таблицы user_test_answers
-- Проблема: 403 Forbidden при попытке создать записи в user_test_answers

-- 1. Включаем RLS для таблицы user_test_answers
ALTER TABLE public.user_test_answers ENABLE ROW LEVEL SECURITY;

-- 2. Удаляем все существующие политики
DROP POLICY IF EXISTS "Users can view their own test answers" ON public.user_test_answers;
DROP POLICY IF EXISTS "Users can create their own test answers" ON public.user_test_answers;
DROP POLICY IF EXISTS "Users can update their own test answers" ON public.user_test_answers;
DROP POLICY IF EXISTS "Users can delete their own test answers" ON public.user_test_answers;

-- 3. Создаем новые политики для всех операций

-- Политика для чтения: пользователи могут видеть свои ответы или ответы в своих попытках
CREATE POLICY "Users can view their own test answers"
ON public.user_test_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_test_attempts
    WHERE user_test_attempts.id = user_test_answers.attempt_id
    AND (
      user_test_attempts.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'trainer'::user_role_enum)
      )
    )
  )
);

-- Политика для создания: пользователи могут создавать ответы для своих попыток
CREATE POLICY "Users can create their own test answers"
ON public.user_test_answers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_test_attempts
    WHERE user_test_attempts.id = user_test_answers.attempt_id
    AND (
      user_test_attempts.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'trainer'::user_role_enum)
      )
    )
  )
);

-- Политика для обновления: пользователи могут обновлять свои ответы
CREATE POLICY "Users can update their own test answers"
ON public.user_test_answers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_test_attempts
    WHERE user_test_attempts.id = user_test_answers.attempt_id
    AND (
      user_test_attempts.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'trainer'::user_role_enum)
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_test_attempts
    WHERE user_test_attempts.id = user_test_answers.attempt_id
    AND (
      user_test_attempts.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'trainer'::user_role_enum)
      )
    )
  )
);

-- Политика для удаления: пользователи могут удалять свои ответы
CREATE POLICY "Users can delete their own test answers"
ON public.user_test_answers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_test_attempts
    WHERE user_test_attempts.id = user_test_answers.attempt_id
    AND (
      user_test_attempts.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('administrator'::user_role_enum, 'moderator'::user_role_enum, 'trainer'::user_role_enum)
      )
    )
  )
);

-- 4. Обновляем кэш PostgREST
NOTIFY pgrst, 'reload schema';

-- 5. Проверяем, что политики созданы
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_test_answers'
ORDER BY policyname;
