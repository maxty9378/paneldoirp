-- Восстановление отсутствующих таблиц
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Создаем таблицу trainer_territories_log
CREATE TABLE IF NOT EXISTS trainer_territories_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('assigned', 'unassigned', 'updated')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем индексы для trainer_territories_log
CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_trainer_id ON trainer_territories_log(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_territory_id ON trainer_territories_log(territory_id);
CREATE INDEX IF NOT EXISTS idx_trainer_territories_log_changed_at ON trainer_territories_log(changed_at);

-- 2. Создаем таблицу user_activity_logs
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_description TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаем индексы для user_activity_logs
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- 3. Создаем триггеры для автоматического логирования изменений trainer_territories
CREATE OR REPLACE FUNCTION log_trainer_territories_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO trainer_territories_log (
            trainer_id, territory_id, action, new_values, changed_by
        ) VALUES (
            NEW.trainer_id, NEW.territory_id, 'assigned', 
            to_jsonb(NEW), COALESCE(auth.uid(), NEW.trainer_id)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO trainer_territories_log (
            trainer_id, territory_id, action, old_values, new_values, changed_by
        ) VALUES (
            NEW.trainer_id, NEW.territory_id, 'updated',
            to_jsonb(OLD), to_jsonb(NEW), COALESCE(auth.uid(), NEW.trainer_id)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO trainer_territories_log (
            trainer_id, territory_id, action, old_values, changed_by
        ) VALUES (
            OLD.trainer_id, OLD.territory_id, 'unassigned',
            to_jsonb(OLD), COALESCE(auth.uid(), OLD.trainer_id)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггеры для trainer_territories
DROP TRIGGER IF EXISTS trainer_territories_log_insert ON trainer_territories;
CREATE TRIGGER trainer_territories_log_insert
    AFTER INSERT ON trainer_territories
    FOR EACH ROW EXECUTE FUNCTION log_trainer_territories_changes();

DROP TRIGGER IF EXISTS trainer_territories_log_update ON trainer_territories;
CREATE TRIGGER trainer_territories_log_update
    AFTER UPDATE ON trainer_territories
    FOR EACH ROW EXECUTE FUNCTION log_trainer_territories_changes();

DROP TRIGGER IF EXISTS trainer_territories_log_delete ON trainer_territories;
CREATE TRIGGER trainer_territories_log_delete
    AFTER DELETE ON trainer_territories
    FOR EACH ROW EXECUTE FUNCTION log_trainer_territories_changes();

-- 4. Создаем триггеры для обновления updated_at
DROP TRIGGER IF EXISTS update_trainer_territories_log_updated_at ON trainer_territories_log;
CREATE TRIGGER update_trainer_territories_log_updated_at
    BEFORE UPDATE ON trainer_territories_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Создаем RLS политики для новых таблиц
ALTER TABLE trainer_territories_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Политики для trainer_territories_log
CREATE POLICY "Users can view trainer territories log" ON trainer_territories_log
    FOR SELECT USING (
        auth.uid() = trainer_id OR 
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('administrator', 'trainer')
        )
    );

CREATE POLICY "Administrators can insert trainer territories log" ON trainer_territories_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'administrator'
        )
    );

-- Политики для user_activity_logs
CREATE POLICY "Users can view their own activity logs" ON user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Administrators can view all activity logs" ON user_activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'administrator'
        )
    );

CREATE POLICY "System can insert activity logs" ON user_activity_logs
    FOR INSERT WITH CHECK (true);

-- 6. Предоставляем права доступа
GRANT ALL ON trainer_territories_log TO authenticated;
GRANT ALL ON user_activity_logs TO authenticated;

-- 7. Добавляем комментарии
COMMENT ON TABLE trainer_territories_log IS 'Логи изменений территорий тренеров';
COMMENT ON TABLE user_activity_logs IS 'Логи активности пользователей';

-- 8. Проверяем результат
SELECT 'Missing Tables Restored Successfully' as status;
