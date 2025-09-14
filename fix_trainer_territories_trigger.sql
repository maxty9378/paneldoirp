-- Исправление триггера для trainer_territories_log
-- Выполните в Supabase SQL Editor

-- 1. Удаляем все существующие триггеры
DROP TRIGGER IF EXISTS trainer_territories_log_trigger ON public.trainer_territories;
DROP TRIGGER IF EXISTS trainer_territories_log_insert ON public.trainer_territories;
DROP TRIGGER IF EXISTS trainer_territories_log_update ON public.trainer_territories;
DROP TRIGGER IF EXISTS trainer_territories_log_delete ON public.trainer_territories;

-- 2. Удаляем существующую функцию с CASCADE
DROP FUNCTION IF EXISTS public.log_trainer_territories_changes() CASCADE;

-- 3. Создаём исправленную функцию
CREATE OR REPLACE FUNCTION public.log_trainer_territories_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Получаем ID текущего пользователя
  current_user_id := auth.uid();
  
  -- Если пользователь не аутентифицирован, используем trainer_id
  IF current_user_id IS NULL THEN
    current_user_id := NEW.trainer_id;
  END IF;

  -- Логируем изменения
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.trainer_territories_log (
      trainer_territory_id,
      trainer_id, 
      territory_id, 
      action, 
      performed_by,
      new_values, 
      changed_by
    ) VALUES (
      NEW.id,
      NEW.trainer_id, 
      NEW.territory_id, 
      'assigned', 
      current_user_id,
      to_jsonb(NEW), 
      current_user_id
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.trainer_territories_log (
      trainer_territory_id,
      trainer_id, 
      territory_id, 
      action, 
      performed_by,
      old_values,
      new_values, 
      changed_by
    ) VALUES (
      NEW.id,
      NEW.trainer_id, 
      NEW.territory_id, 
      CASE 
        WHEN OLD.is_active != NEW.is_active AND NEW.is_active = false THEN 'deactivated'
        WHEN OLD.is_active != NEW.is_active AND NEW.is_active = true THEN 'activated'
        ELSE 'updated'
      END, 
      current_user_id,
      to_jsonb(OLD),
      to_jsonb(NEW), 
      current_user_id
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.trainer_territories_log (
      trainer_territory_id,
      trainer_id, 
      territory_id, 
      action, 
      performed_by,
      old_values,
      changed_by
    ) VALUES (
      OLD.id,
      OLD.trainer_id, 
      OLD.territory_id, 
      'deleted', 
      current_user_id,
      to_jsonb(OLD), 
      current_user_id
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Создаём триггер
CREATE TRIGGER trainer_territories_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.trainer_territories
  FOR EACH ROW EXECUTE FUNCTION public.log_trainer_territories_changes();

-- 5. Проверяем, что триггер создан
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trainer_territories' 
  AND event_object_schema = 'public';
