-- Исправление ограничений для таблицы trainer_territories_log

-- Изменяем внешний ключ trainer_territory_id чтобы он мог быть NULL
ALTER TABLE trainer_territories_log 
DROP CONSTRAINT IF EXISTS trainer_territories_log_trainer_territory_id_fkey;

ALTER TABLE trainer_territories_log 
ADD CONSTRAINT trainer_territories_log_trainer_territory_id_fkey 
FOREIGN KEY (trainer_territory_id) 
REFERENCES public.trainer_territories(id) 
ON DELETE SET NULL;

-- Обновляем функцию логирования
CREATE OR REPLACE FUNCTION log_trainer_territory_changes()
RETURNS TRIGGER AS $$
DECLARE
  action_type text;
  metadata jsonb;
  log_id uuid;
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

  -- Генерируем ID для лога
  log_id := gen_random_uuid();

  -- Записываем в лог (для DELETE не используем trainer_territory_id)
  INSERT INTO trainer_territories_log (
    id,
    trainer_territory_id,
    trainer_id,
    territory_id,
    action,
    performed_by,
    metadata
  ) VALUES (
    log_id,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE COALESCE(NEW.id, OLD.id) END,
    COALESCE(NEW.trainer_id, OLD.trainer_id),
    COALESCE(NEW.territory_id, OLD.territory_id),
    action_type,
    auth.uid(),
    metadata
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
