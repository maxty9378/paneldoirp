-- Создаем RPC функцию для получения пользователя по QR токену
-- Эта функция обходит RLS политики, так как выполняется с правами создателя
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
GRANT EXECUTE ON FUNCTION get_qr_token_user(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_qr_token_user(TEXT) TO authenticated;

-- Проверяем, что таблица user_qr_tokens существует и имеет данные
DO $$
BEGIN
  -- Проверяем существование таблицы
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_qr_tokens') THEN
    RAISE EXCEPTION 'Таблица user_qr_tokens не существует!';
  END IF;
  
  -- Проверяем количество записей
  DECLARE
    token_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO token_count FROM public.user_qr_tokens WHERE is_active = true;
    RAISE NOTICE 'Активных QR токенов: %', token_count;
  END;
END $$;
