-- Создание таблицы для аудита изменений филиалов тренеров
CREATE TABLE IF NOT EXISTS trainer_territories_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_territory_id uuid REFERENCES public.trainer_territories(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  territory_id uuid REFERENCES public.territories(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN ('assigned', 'unassigned', 'activated', 'deactivated', 'deleted')),
  performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  performed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_trainer_id ON trainer_territories_log (trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_territory_id ON trainer_territories_log (territory_id);
CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_performed_by ON trainer_territories_log (performed_by);
CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_performed_at ON trainer_territories_log (performed_at DESC);

-- RLS политики
ALTER TABLE trainer_territories_log ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики если есть
DROP POLICY IF EXISTS "Administrators can view all trainer territories logs" ON trainer_territories_log;
DROP POLICY IF EXISTS "Trainers and moderators can view their own logs" ON trainer_territories_log;
DROP POLICY IF EXISTS "System can insert logs" ON trainer_territories_log;

-- Администраторы могут видеть все логи
CREATE POLICY "Administrators can view all trainer territories logs"
  ON trainer_territories_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'administrator'));

-- Тренеры и модераторы могут видеть только свои логи
CREATE POLICY "Trainers and moderators can view their own logs"
  ON trainer_territories_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'trainer' OR role = 'moderator'))
    AND trainer_id = auth.uid()
  );

-- Политика для вставки логов (системная)
CREATE POLICY "System can insert logs"
  ON trainer_territories_log FOR INSERT
  WITH CHECK (true);

-- Функция для автоматического логирования изменений
CREATE OR REPLACE FUNCTION log_trainer_territory_changes()
RETURNS TRIGGER AS $$
DECLARE
  action_type text;
  metadata jsonb;
BEGIN
  -- Определяем тип действия
  IF TG_OP = 'INSERT' THEN
    action_type := 'assigned';
    metadata := jsonb_build_object(
      'is_active', NEW.is_active,
      'assigned_at', NEW.assigned_at
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active != NEW.is_active THEN
      action_type := CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END;
      metadata := jsonb_build_object(
        'old_is_active', OLD.is_active,
        'new_is_active', NEW.is_active
      );
    ELSE
      -- Другие изменения (если будут)
      action_type := 'updated';
      metadata := jsonb_build_object(
        'changes', jsonb_build_object(
          'old', to_jsonb(OLD),
          'new', to_jsonb(NEW)
        )
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
    metadata := jsonb_build_object(
      'was_active', OLD.is_active,
      'assigned_at', OLD.assigned_at
    );
  END IF;

  -- Записываем в лог
  INSERT INTO trainer_territories_log (
    trainer_territory_id,
    trainer_id,
    territory_id,
    action,
    performed_by,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.trainer_id, OLD.trainer_id),
    COALESCE(NEW.territory_id, OLD.territory_id),
    action_type,
    auth.uid(),
    metadata
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Удаляем существующие триггеры если есть
DROP TRIGGER IF EXISTS trainer_territories_log_insert ON trainer_territories;
DROP TRIGGER IF EXISTS trainer_territories_log_update ON trainer_territories;
DROP TRIGGER IF EXISTS trainer_territories_log_delete ON trainer_territories;

-- Триггеры для автоматического логирования
CREATE TRIGGER trainer_territories_log_insert
  AFTER INSERT ON trainer_territories
  FOR EACH ROW
  EXECUTE FUNCTION log_trainer_territory_changes();

CREATE TRIGGER trainer_territories_log_update
  AFTER UPDATE ON trainer_territories
  FOR EACH ROW
  EXECUTE FUNCTION log_trainer_territory_changes();

CREATE TRIGGER trainer_territories_log_delete
  AFTER DELETE ON trainer_territories
  FOR EACH ROW
  EXECUTE FUNCTION log_trainer_territory_changes();
