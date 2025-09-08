-- Создаём таблицу для постоянных QR токенов
CREATE TABLE IF NOT EXISTS public.user_qr_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Создаём индексы
CREATE INDEX IF NOT EXISTS idx_user_qr_tokens_user_id ON public.user_qr_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_qr_tokens_token ON public.user_qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_qr_tokens_active ON public.user_qr_tokens(is_active);

-- RLS политики
ALTER TABLE public.user_qr_tokens ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои токены
CREATE POLICY "Users can view own QR tokens" ON public.user_qr_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- Админы могут всё
CREATE POLICY "Admins can manage all QR tokens" ON public.user_qr_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('administrator', 'moderator')
    )
  );

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_user_qr_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления updated_at
DROP TRIGGER IF EXISTS trigger_update_user_qr_tokens_updated_at ON public.user_qr_tokens;
CREATE TRIGGER trigger_update_user_qr_tokens_updated_at
  BEFORE UPDATE ON public.user_qr_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_qr_tokens_updated_at();
