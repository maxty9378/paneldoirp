-- Исправление QR авторизации: создание отсутствующей функции get_qr_token_user
-- Проблема: Edge function auth-by-qr-token пытается вызвать функцию, которой нет в БД

-- Создаем RPC функцию для получения пользователя по QR токену
-- Эта функция обходит RLS политики, так как выполняется с правами создателя (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_qr_token_user(token_param TEXT)
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT uqt.user_id
  FROM public.user_qr_tokens uqt
  WHERE uqt.token = token_param
    AND uqt.is_active = true;
END;
$$;

-- Даем права на выполнение функции анонимным пользователям
-- Это необходимо, так как QR авторизация происходит до входа пользователя
GRANT EXECUTE ON FUNCTION get_qr_token_user(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_qr_token_user(TEXT) TO authenticated;

-- Комментарий к функции для документации
COMMENT ON FUNCTION get_qr_token_user(TEXT) IS 
'Возвращает user_id для активного QR токена. Используется Edge Function auth-by-qr-token для авторизации по QR-коду.';

-- Проверяем, что функция создана успешно
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'get_qr_token_user'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✅ Функция get_qr_token_user успешно создана';
  ELSE
    RAISE EXCEPTION '❌ Ошибка: функция get_qr_token_user не была создана';
  END IF;
END $$;

-- Тестируем функцию с существующим токеном
DO $$
DECLARE
  test_token TEXT;
  test_user_id UUID;
BEGIN
  -- Берем первый активный токен для теста
  SELECT token INTO test_token 
  FROM public.user_qr_tokens 
  WHERE is_active = true 
  LIMIT 1;
  
  IF test_token IS NOT NULL THEN
    -- Вызываем функцию
    SELECT user_id INTO test_user_id
    FROM get_qr_token_user(test_token);
    
    IF test_user_id IS NOT NULL THEN
      RAISE NOTICE '✅ Тест функции успешен. Token: %, User ID: %', 
        substring(test_token, 1, 8) || '...', test_user_id;
    ELSE
      RAISE WARNING '⚠️ Функция вернула NULL для токена %', substring(test_token, 1, 8);
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ Нет активных токенов для теста';
  END IF;
END $$;

