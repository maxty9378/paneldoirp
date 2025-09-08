-- Подтверждаем email для тестовых пользователей
-- Это позволит им использовать magic link для входа

UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email IN ('doirp@sns.ru', 'max22@max.ru');

-- Проверяем результат
SELECT email, email_confirmed_at, confirmed_at 
FROM auth.users 
WHERE email IN ('doirp@sns.ru', 'max22@max.ru');
