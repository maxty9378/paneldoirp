-- Создание таблицы для связи тренеров с территориями
CREATE TABLE IF NOT EXISTS trainer_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  territory_id uuid NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Уникальное ограничение: один тренер может быть назначен на одну территорию только один раз
  UNIQUE(trainer_id, territory_id)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_trainer_territories_trainer_id ON trainer_territories(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_territories_territory_id ON trainer_territories(territory_id);
CREATE INDEX IF NOT EXISTS idx_trainer_territories_is_active ON trainer_territories(is_active);

-- Включение RLS
ALTER TABLE trainer_territories ENABLE ROW LEVEL SECURITY;

-- Политика доступа: только администраторы могут управлять назначениями
CREATE POLICY "Administrators can manage trainer territories" ON trainer_territories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'administrator'
      AND users.is_active = true
    )
  );

-- Политика чтения для тренеров и модераторов
CREATE POLICY "Trainers and moderators can view trainer territories" ON trainer_territories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('trainer', 'moderator', 'administrator')
      AND users.is_active = true
    )
  );

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_trainer_territories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем триггер если существует, затем создаем заново
DROP TRIGGER IF EXISTS trigger_update_trainer_territories_updated_at ON trainer_territories;
CREATE TRIGGER trigger_update_trainer_territories_updated_at
  BEFORE UPDATE ON trainer_territories
  FOR EACH ROW
  EXECUTE FUNCTION update_trainer_territories_updated_at();
