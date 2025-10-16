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

