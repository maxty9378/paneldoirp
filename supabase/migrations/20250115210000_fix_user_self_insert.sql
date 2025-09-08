-- Исправляем проблему с самостоятельной регистрацией пользователей
-- Пользователи должны иметь возможность создать свой собственный профиль

-- Добавляем политику для самостоятельного создания профиля
CREATE POLICY "Users can create own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Также разрешаем пользователям обновлять свой собственный профиль
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
