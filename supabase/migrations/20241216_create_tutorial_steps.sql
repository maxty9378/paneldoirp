-- Создание таблицы для отслеживания показанных подсказок
CREATE TABLE IF NOT EXISTS tutorial_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL, -- например, 'evaluation_modal_tour'
  shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальность: один пользователь может видеть подсказку только один раз
  UNIQUE(user_id, step_key)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_tutorial_steps_user_id ON tutorial_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_steps_step_key ON tutorial_steps(step_key);

-- RLS политики
ALTER TABLE tutorial_steps ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои записи
CREATE POLICY "Users can view own tutorial steps" ON tutorial_steps
  FOR SELECT USING (auth.uid() = user_id);

-- Пользователи могут создавать только свои записи
CREATE POLICY "Users can insert own tutorial steps" ON tutorial_steps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять только свои записи
CREATE POLICY "Users can update own tutorial steps" ON tutorial_steps
  FOR UPDATE USING (auth.uid() = user_id);

-- Функция для проверки, была ли показана подсказка
CREATE OR REPLACE FUNCTION has_tutorial_step_been_shown(step_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tutorial_steps 
    WHERE user_id = auth.uid() AND step_key = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для отметки подсказки как показанной
CREATE OR REPLACE FUNCTION mark_tutorial_step_as_shown(step_key TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO tutorial_steps (user_id, step_key)
  VALUES (auth.uid(), $1)
  ON CONFLICT (user_id, step_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
